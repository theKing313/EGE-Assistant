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
  'https://a268a490-234e-47e5-8149-7a675f27ef76-00-2lcbihyksuwdv.janeway.replit.dev'

export const API_TIMEOUT_MS = 12_000
