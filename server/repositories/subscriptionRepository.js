/**
 * subscriptionRepository.js — all DB access for the subscriptions table.
 */
import { query } from '../config/database.js'

const FREE_DEFAULTS = {
  plan: 'free',
  status: 'active',
  ai_limit_per_day: 20,
  expires_at: null,
}

export async function findByUserId(userId) {
  const res = await query(
    'SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1',
    [userId]
  )
  return res.rows[0] || null
}

/**
 * Returns subscription or synthesizes a free-tier default if none exists.
 */
export async function getOrDefault(userId) {
  const sub = await findByUserId(userId)
  if (sub) return sub
  return { user_id: userId, ...FREE_DEFAULTS }
}

export async function upsert(userId, { plan, status, aiLimitPerDay, expiresAt }) {
  const res = await query(
    `INSERT INTO subscriptions (user_id, plan, status, ai_limit_per_day, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
       SET plan = EXCLUDED.plan,
           status = EXCLUDED.status,
           ai_limit_per_day = EXCLUDED.ai_limit_per_day,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW()
     RETURNING *`,
    [userId, plan, status, aiLimitPerDay ?? 20, expiresAt ?? null]
  )
  return res.rows[0]
}
