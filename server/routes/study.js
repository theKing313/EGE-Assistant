/**
 * routes/study.js — Premium study history, plan, stats, review.
 */
import { Router } from "express";
import { requireAuth, requirePremium } from "../middleware/auth.js";
import * as studyService from "../services/studyService.js";

const router = Router();

router.use(requireAuth, requirePremium);

router.post("/tasks/:action", async (req, res) => {
  const action = req.params.action;
  if (!["open", "lamp", "complete", "review"].includes(action)) {
    return res.status(400).json({ error: "Unknown action" });
  }
  try {
    const task = await studyService.recordTask(
      req.user.userId,
      req.body || {},
      action,
    );
    res.json({ task });
  } catch (err) {
    console.error("[Study] record error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await studyService.getHistory(req.user.userId);
    res.json(history);
  } catch (err) {
    console.error("[Study] history error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const dashboard = await studyService.getDashboard(req.user.userId);
    res.json(dashboard);
  } catch (err) {
    console.error("[Study] dashboard error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await studyService.getStats(req.user.userId);
    res.json(stats);
  } catch (err) {
    console.error("[Study] stats error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/review", async (req, res) => {
  try {
    const review = await studyService.getReview(req.user.userId);
    res.json({ review });
  } catch (err) {
    console.error("[Study] review error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
