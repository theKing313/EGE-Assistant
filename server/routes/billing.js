/**
 * routes/billing.js — billing skeleton.
 *
 * Prepared for Stripe / LemonSqueezy integration.
 * All endpoints return 501 until a payment provider is configured.
 *
 * Future endpoints:
 *   POST /api/billing/create-checkout  — start payment session
 *   POST /api/billing/webhook          — handle payment events
 *   GET  /api/billing/portal           — customer portal URL
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as subscriptionService from "../services/subscriptionService.js";

const router = Router();

router.post("/create-checkout", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    const status = await subscriptionService.setPlan(
      req.user.userId,
      "premium",
      {
        aiLimitPerDay: 300,
      },
    );
    return res.json({ mode: "development", status });
  }

  res.status(501).json({
    error: "Billing not yet configured",
    message: "Connect a payment provider to enable subscriptions",
  });
});

router.get("/portal", requireAuth, (_req, res) => {
  res.status(501).json({ error: "Billing not yet configured" });
});

// Webhook: no auth — provider sends its own signature
router.post("/webhook", (_req, res) => {
  res.status(501).json({ error: "Billing not yet configured" });
});

export default router;
