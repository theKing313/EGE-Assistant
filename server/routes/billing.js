/**
 * routes/billing.js — YooKassa checkout and subscription webhook.
 */
import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import * as subscriptionService from "../services/subscriptionService.js";
import * as analyticsRepository from "../repositories/analyticsRepository.js";
import { getBillingConfig } from "../config/billing.js";

const router = Router();

function yookassaConfigured() {
  return Boolean(
    process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY,
  );
}

function yookassaAuth() {
  const credentials = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

async function yookassaRequest(path, options = {}) {
  const response = await fetch(`https://api.yookassa.ru/v3${path}`, {
    ...options,
    headers: {
      Authorization: yookassaAuth(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.description || `YooKassa HTTP ${response.status}`);
  }

  return data;
}

function premiumExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt;
}

async function activatePremium(payment) {
  const userId = payment?.metadata?.userId;
  if (payment?.status !== "succeeded" || !userId) return false;

  await subscriptionService.setPlan(Number(userId), "premium", {
    aiLimitPerDay: 300,
    expiresAt: premiumExpiresAt(),
  });
  await analyticsRepository.track(Number(userId), "premium_conversion", {
    source: "yookassa",
    paymentId: payment.id,
  });
  return true;
}

router.get("/config", (_req, res) => {
  res.json(getBillingConfig());
});

router.post("/create-checkout", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    await subscriptionService.setPlan(req.user.userId, "premium", {
      aiLimitPerDay: 300,
    });
    const fullStatus = await subscriptionService.getStatus(req.user.userId);
    await analyticsRepository.track(req.user.userId, "premium_conversion", {
      source: "create-checkout",
    });
    return res.json({ mode: "development", status: fullStatus });
  }

  if (!yookassaConfigured()) {
    return res.status(503).json({
      error: "Billing not configured",
      message: "YooKassa credentials are missing",
    });
  }

  try {
    const pricing = getBillingConfig();
    const payment = await yookassaRequest("/payments", {
      method: "POST",
      headers: { "Idempotence-Key": crypto.randomUUID() },
      body: JSON.stringify({
        amount: {
          value: Number(pricing.monthlyAmount).toFixed(2),
          currency: pricing.currency,
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url:
            process.env.YOOKASSA_RETURN_URL || "https://smartege.ru/payment",
        },
        description: "SmartEGE Premium на 1 месяц",
        metadata: {
          userId: String(req.user.userId),
          plan: "premium",
        },
      }),
    });

    return res.json({
      provider: "yookassa",
      paymentId: payment.id,
      url: payment.confirmation?.confirmation_url,
    });
  } catch (error) {
    console.error("[Billing] YooKassa checkout error:", error.message);
    return res.status(502).json({
      error: "Payment provider error",
      message: "Не удалось создать платёж",
    });
  }
});

router.get("/portal", requireAuth, (_req, res) => {
  res.status(501).json({ error: "Billing portal not supported" });
});

// Webhook: no auth — provider sends its own signature
router.post("/webhook", async (req, res) => {
  if (!yookassaConfigured()) return res.sendStatus(503);

  try {
    const paymentId = req.body?.object?.id;
    if (req.body?.event === "payment.succeeded" && paymentId) {
      const payment = await yookassaRequest(`/payments/${paymentId}`);
      await activatePremium(payment);
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error("[Billing] YooKassa webhook error:", error.message);
    return res.sendStatus(500);
  }
});

export default router;
