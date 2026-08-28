/**
 * routes/ai.js
 *
 * POST /api/ai/hint  — get an AI-generated hint (requires auth)
 * GET  /api/ai/status — check AI availability and user's remaining quota
 */
import { Router } from "express";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import * as aiService from "../services/aiService.js";
import * as usageService from "../services/usageService.js";
import * as subscriptionService from "../services/subscriptionService.js";

const router = Router();

/**
 * POST /api/ai/hint
 * Body: { subject, taskText, level }
 */
router.post("/hint", requireAuth, async (req, res) => {
  const { subject, taskText, level } = req.body;
  const userId = req.user.userId;

  if (!subject || !taskText || !level) {
    return res
      .status(400)
      .json({ error: "subject, taskText, and level are required" });
  }

  // Gate: check subscription allows AI access
  const sub = await subscriptionService.getStatus(userId);
  if (!sub.features.aiAccess) {
    return res.status(403).json({
      error: "AI access requires Premium",
      code: "PREMIUM_REQUIRED",
    });
  }

  // Gate: check daily limit
  const limitInfo = await usageService.checkLimit(userId);

  if (!limitInfo.allowed) {
    return res.status(429).json({
      error: "Daily AI limit reached",
      code: "LIMIT_REACHED",
      used: limitInfo.used,
      limit: limitInfo.limit,
      plan: limitInfo.plan,
    });
  }

  // Get hint (cache-first, then API)
  try {
    const hint = await aiService.getHint({ subject, taskText, level }); //level

    if (hint.available === false) {
      return res.status(503).json({
        error: "AI is not configured yet",
        code: "AI_NOT_CONFIGURED",
      });
    }

    // Only charge usage if the result came from the live API (not cache)
    let usage = limitInfo;
    if (hint.source === "ai") {
      usage = await usageService.recordUsage(userId);
    }

    res.json({ hint, usage });
  } catch (err) {
    console.error("[AI Route] Error:", {
      message: err.message,
      provider: err.provider || null,
      phase: err.phase || null,
      statusCode: err.statusCode || null,
      attempts: err.attempts || null,
      requestId: err.requestId || null,
      responseBody: err.responseBody || null,
    });
    res.status(502).json({
      error: "AI request failed",
      detail: err.message,
      provider: err.provider || null,
      phase: err.phase || null,
      statusCode: err.statusCode || null,
      attempts: err.attempts || null,
      requestId: err.requestId || null,
      upstream: err.responseBody || null,
    });
  }
});

/**
 * GET /api/ai/status
 * Returns: { available, plan, used, limit, remaining }
 */
router.get("/status", requireAuth, async (req, res) => {
  try {
    const [limitInfo, available] = await Promise.all([
      usageService.checkLimit(req.user.userId),
      Promise.resolve(aiService.isAvailable()),
    ]);
    res.json({ available, ...limitInfo });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
