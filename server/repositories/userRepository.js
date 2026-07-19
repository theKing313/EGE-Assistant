/**
 * userRepository.js — all DB access for the users table.
 */
import { query } from '../config/database.js'

export async function findByGoogleId(googleId) {
  const res = await query(
    'SELECT * FROM users WHERE google_id = $1 LIMIT 1',
    [googleId]
  )
  return res.rows[0] || null
}

export async function findById(id) {
  const res = await query(
    'SELECT id, email, name, avatar, created_at FROM users WHERE id = $1 LIMIT 1',
    [id]
  )
  return res.rows[0] || null
}

export async function create({ googleId, email, name, avatar }) {
  const res = await query(
    `INSERT INTO users (google_id, email, name, avatar)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [googleId, email, name, avatar]
  )
  return res.rows[0]
}

export async function upsert({ googleId, email, name, avatar }) {
  const res = await query(
    `INSERT INTO users (google_id, email, name, avatar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE
       SET email = EXCLUDED.email,
           name  = EXCLUDED.name,
           avatar = EXCLUDED.avatar,
           updated_at = NOW()
     RETURNING *`,
    [googleId, email, name, avatar]
  )
  return res.rows[0]
}
