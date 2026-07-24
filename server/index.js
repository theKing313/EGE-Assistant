/**
 * server/index.js — SmartEGE Express backend
 *
 * Domains:
 *   /api/auth          — authentication (Google OAuth + JWT)
 *   /api/ai            — AI hint generation with caching and rate limits
 *   /api/subscriptions — subscription status and feature flags
 *   /api/users         — user profile and usage history
 *   /api/billing       — billing skeleton (Stripe-ready)
 *
 * Security: helmet, CORS restricted to extension origin + Replit domain.
 */
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import userRoutes from "./routes/users.js";
import billingRoutes from "./routes/billing.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  /^chrome-extension:\/\//, // Chrome extension (popup + content script)
  /\.replit\.dev$/, // Replit dev domains
  /\.repl\.co$/, // Replit deployed domains
  "http://localhost:5173", // Vite dev server
  "http://localhost:3001", // Local backend (same-origin curl / health checks)
  // Supported exam sites — content script fetch runs with page origin
  /\.sdamgia\.ru$/,
  /\.reshu\.ru$/,
  /\.fipi\.ru$/,
  /\.ege\.ru$/,
  /\.ege.sdamgia.ru$/,
  "https://ege.sdamgia.ru/",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server / curl
      const allowed = allowedOrigins.some((pattern) =>
        typeof pattern === "string" ? origin === pattern : pattern.test(origin),
      );
      if (allowed) return callback(null, true);
      // Return 403, not an unhandled error — keeps logs clean
      callback(null, false);
    },
    credentials: true,
  }),
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));

// ── Global rate limit ────────────────────────────────────────────────────────
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down" },
  }),
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/billing", billingRoutes);

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Server] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SmartEGE] Backend running on port ${PORT}`);
  console.log(
    `[SmartEGE] AI configured: ${Boolean(process.env.OPENAI_API_KEY)}`,
  );
});
