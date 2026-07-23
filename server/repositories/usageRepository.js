/**
 * usageRepository.js — daily AI request counters per user.
 */
import { query } from '../config/database.js'

/**
 * Get today's usage count for a user. Returns 0 if no row yet.
 */
export async function getTodayCount(userId) {
  const res = await query(
    `SELECT ai_requests FROM usage_logs
     WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  )
  return res.rows[0]?.ai_requests ?? 0
}

/**
 * Increment today's counter by 1 (insert row if absent).
 * Returns the new count.
 */
export async function increment(userId) {
  const res = await query(
    `INSERT INTO usage_logs (user_id, date, ai_requests)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date) DO UPDATE
       SET ai_requests = usage_logs.ai_requests + 1
     RETURNING ai_requests`,
    [userId]
  )
  return res.rows[0].ai_requests
}

/**
 * Get usage stats for the last N days.
 */
export async function getHistory(userId, days = 7) {
  const res = await query(
    `SELECT date, ai_requests FROM usage_logs
     WHERE user_id = $1 AND date >= CURRENT_DATE - $2
     ORDER BY date DESC`,
    [userId, days]
  )
  return res.rows
}
