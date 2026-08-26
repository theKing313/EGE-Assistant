/**
 * subscriptionService.js (extension side)
 *
 * Fetches subscription status from backend and caches it briefly.
 * All feature flags come from the server — nothing is hardcoded.
 */
import { API_BASE_URL } from "../config.js";
import { authFetch, isLoggedIn } from "./authService.js";

// In-memory cache — refreshed on each popup open
let _cached = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const FREE_STATUS = {
  plan: "free",
  status: "active",
  features: {
    aiAccess: false,
    fullExplanations: false,
    dailyHintLimit: 50,
    aiLimitPerDay: 20,
  },
  aiLimitPerDay: 20,
};

export async function getStatus(forceRefresh = false) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) return FREE_STATUS;

  const now = Date.now();
  if (!forceRefresh && _cached && now - _cachedAt < CACHE_TTL_MS) {
    return _cached;
  }

  try {
    const res = await authFetch(`${API_BASE_URL}/api/subscriptions/status`);
    if (!res.ok) return FREE_STATUS;
    const data = await res.json();
    _cached = data;
    _cachedAt = now;
    return data;
  } catch {
    return _cached || FREE_STATUS;
  }
}

export async function isPremium() {
  const status = await getStatus();
  return status.plan === "premium";
}

export async function canUseAI() {
  const status = await getStatus();
  return status.features?.aiAccess === true;
}

export function invalidateCache() {
  _cached = null;
  _cachedAt = 0;
}
