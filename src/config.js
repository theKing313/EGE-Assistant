/**
 * config.js — single source of truth for backend URL.
 *
 * Local development should default to the backend running on localhost.
 * Production builds should use an explicit VITE_API_URL or the live backend.
 */
const DEFAULT_PROD_API_BASE_URL =
  "https://ege-assistant--fredfard312.replit.app";

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
const isDevelopmentApiUrl = /\.replit\.dev(?:\/|$)/i.test(
  configuredApiBaseUrl || "",
);

export const API_BASE_URL =
  import.meta.env.DEV
    ? configuredApiBaseUrl || "http://localhost:3001"
    : configuredApiBaseUrl && !isDevelopmentApiUrl
      ? configuredApiBaseUrl
      : DEFAULT_PROD_API_BASE_URL;

export const API_TIMEOUT_MS = 12_000;
