/**
 * config.js — single source of truth for backend URL.
 *
 * To set during development on Replit:
 *   VITE_API_URL=https://<your-repl-slug>.repl.co
 *
 * In the extension, this is baked in at build time by Vite.
 * For production, set VITE_API_URL before running `npm run build`.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3001'

export const API_TIMEOUT_MS = 12_000
