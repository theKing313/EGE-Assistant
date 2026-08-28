/**
 * subscriptionService.js — subscription status and feature gating.
 *
 * Feature matrix:
 *   free:    JSON hints (limited), no AI fallback
 *   premium: JSON hints (unlimited), AI fallback, full explanations
 *
 * All feature flags come from the DB — nothing is hardcoded in the client.
 */
import * as subscriptionRepository from '../repositories/subscriptionRepository.js'
import { getBillingConfig } from '../config/billing.js'

const FEATURES = {
  free: {
    aiAccess: false,
    fullExplanations: false,
    dailyHintLimit: 50,
    aiLimitPerDay: 20,
    studyPlanning: false,
    progressTracking: false,
  },
  premium: {
    aiAccess: true,
    fullExplanations: true,
    dailyHintLimit: null, // unlimited
    aiLimitPerDay: 300,
    studyPlanning: true,
    progressTracking: true,
  },
}

export async function getStatus(userId) {
  const sub = await subscriptionRepository.getOrDefault(userId)
  const isActive = sub.status === 'active'
  const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date()
  const effectivePlan = (isActive && !isExpired) ? sub.plan : 'free'
  const features = FEATURES[effectivePlan] || FEATURES.free

  const pricing = getBillingConfig()

  return {
    plan: effectivePlan,
    status: sub.status,
    expiresAt: sub.expires_at,
    features,
    aiLimitPerDay: sub.ai_limit_per_day ?? features.aiLimitPerDay,
    pricing,
  }
}

export async function isPremium(userId) {
  const status = await getStatus(userId)
  return status.plan === 'premium'
}

/**
 * Admin: upgrade a user to premium.
 * In production, this would be called by the billing webhook.
 */
export async function setPlan(userId, plan, options = {}) {
  return subscriptionRepository.upsert(userId, {
    plan,
    status: 'active',
    aiLimitPerDay: options.aiLimitPerDay ?? (plan === 'premium' ? 300 : 20),
    expiresAt: options.expiresAt ?? null,
  })
}
