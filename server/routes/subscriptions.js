/**
 * routes/subscriptions.js
 *
 * GET /api/subscriptions/status  — current user's plan and features
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as subscriptionService from "../services/subscriptionService.js";
import { getBillingConfig } from "../config/billing.js";

const router = Router();

router.get("/pricing", (_req, res) => {
  res.json(getBillingConfig());
});

router.get("/status", requireAuth, async (req, res) => {
  try {
    const status = await subscriptionService.getStatus(req.user.userId);
    res.json(status);
  } catch (err) {
    console.error("[Subscriptions] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/upgrade", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Upgrade not allowed in production" });
  }

  try {
    await subscriptionService.setPlan(req.user.userId, "premium", {
      aiLimitPerDay: 300,
    });
    const status = await subscriptionService.getStatus(req.user.userId);
    res.json(status);
  } catch (err) {
    console.error("[Subscriptions] Upgrade error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
