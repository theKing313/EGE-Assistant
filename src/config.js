/**
 * config.js — single source of truth for backend URL.
 *
 * Local development should default to the backend running on localhost.
 * Production builds should use an explicit VITE_API_URL or the live backend.
 */
const DEFAULT_PROD_API_BASE_URL =
  "https://a268a490-234e-47e5-8149-7a675f27ef76-00-2lcbihyksuwdv.janeway.replit.dev";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : DEFAULT_PROD_API_BASE_URL);

export const API_TIMEOUT_MS = 12_000;
