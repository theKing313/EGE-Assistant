/**
 * aiCacheRepository.js — store and retrieve cached AI responses.
 * Prevents paying twice for the same question.
 */
import { query } from '../config/database.js'

export async function findByKey(cacheKey) {
  const res = await query(
    `UPDATE ai_cache SET used_count = used_count + 1
     WHERE cache_key = $1
     RETURNING *`,
    [cacheKey]
  )
  return res.rows[0] || null
}

export async function save(cacheKey, subject, response) {
  const res = await query(
    `INSERT INTO ai_cache (cache_key, subject, response)
     VALUES ($1, $2, $3)
     ON CONFLICT (cache_key) DO UPDATE
       SET used_count = ai_cache.used_count + 1
     RETURNING *`,
    [cacheKey, subject, JSON.stringify(response)]
  )
  return res.rows[0]
}

export async function getStats() {
  const res = await query(
    `SELECT COUNT(*) as total_entries,
            SUM(used_count) as total_hits,
            SUM(used_count - 1) as cache_saves
     FROM ai_cache`
  )
  return res.rows[0]
}
