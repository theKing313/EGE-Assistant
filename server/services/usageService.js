/**
 * usageService.js — daily AI request limits enforcement.
 *
 * Free users:    20 AI requests / day  (configurable)
 * Premium users: configurable limit    (default 300/day)
 *
 * Limits are stored in the subscriptions table (ai_limit_per_day).
 * Counters live in usage_logs (reset daily by virtue of date-keyed rows).
 */
import * as usageRepository from '../repositories/usageRepository.js'
import * as subscriptionRepository from '../repositories/subscriptionRepository.js'

/**
 * Check whether a user can make another AI request.
 * @returns {{ allowed: boolean, used: number, limit: number, remaining: number }}
 */
export async function checkLimit(userId) {
  const [sub, used] = await Promise.all([
    subscriptionRepository.getOrDefault(userId),
    usageRepository.getTodayCount(userId),
  ])

  const limit = sub.ai_limit_per_day ?? 20
  const remaining = Math.max(0, limit - used)

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
    plan: sub.plan,
  }
}

/**
 * Increment the counter and return the new usage info.
 * Call AFTER a successful AI response to avoid charging for errors.
 */
export async function recordUsage(userId) {
  const newCount = await usageRepository.increment(userId)
  const sub = await subscriptionRepository.getOrDefault(userId)
  const limit = sub.ai_limit_per_day ?? 20

  return {
    used: newCount,
    limit,
    remaining: Math.max(0, limit - newCount),
    plan: sub.plan,
  }
}

/**
 * Get usage history for the last N days.
 */
export async function getHistory(userId, days = 7) {
  return usageRepository.getHistory(userId, days)
}
