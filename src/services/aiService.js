/**
 * aiService.js (extension side)
 *
 * Calls the SmartEGE backend for AI-generated hints.
 * The backend handles: caching, rate limiting, OpenAI API, logging.
 *
 * This module is only called from knowledgeService when JSON returns no match.
 * It is NEVER called if a JSON entry was found (cost guarantee).
 */
import { API_BASE_URL } from '../config.js'
import { authFetch, isLoggedIn } from './authService.js'

/**
 * Request an AI hint from the backend.
 *
 * @param {{ subject, taskText, level }} params
 * @returns {{ title, text, example, source } | { error, code }}
 */
export async function getHint({ subject, taskText, level }) {
  const loggedIn = await isLoggedIn()
  if (!loggedIn) {
    return { error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }
  }

  try {
    const res = await authFetch(`${API_BASE_URL}/api/ai/hint`, {
      method: 'POST',
      body: JSON.stringify({ subject, taskText, level }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { error: data.error || 'AI error', code: data.code || 'AI_ERROR' }
    }

    return data.hint // { title, text, example, source: 'ai'|'ai-cache' }
  } catch (err) {
    console.warn('[SmartEGE] aiService error:', err.message)
    return { error: 'Network error', code: 'NETWORK_ERROR' }
  }
}

/**
 * Get AI availability and today's quota.
 */
export async function getStatus() {
  const loggedIn = await isLoggedIn()
  if (!loggedIn) return null

  try {
    const res = await authFetch(`${API_BASE_URL}/api/ai/status`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
