/**
 * Require a valid JWT, then an active Premium plan.
 */
import { verifyJwt } from "../services/authService.js";
import * as subscriptionService from "../services/subscriptionService.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const token = header.slice(7);
  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = verifyJwt(header.slice(7));
    } catch {
      // ignore invalid tokens in optional mode
    }
  }
  next();
}

export async function requirePremium(req, res, next) {
  try {
    const premium = await subscriptionService.isPremium(req.user.userId);
    if (!premium) {
      return res.status(403).json({
        error: "premium_required",
        message: "Доступно в SmartEGE Premium",
      });
    }
    next();
  } catch (err) {
    console.error("[Auth] Premium check failed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
