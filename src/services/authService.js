/**
 * authService.js (extension side)
 *
 * Handles Google OAuth via chrome.identity and JWT storage.
 *
 * Flow:
 *   1. chrome.identity.getAuthToken() → Google access token
 *   2. POST /api/auth/google → SmartEGE JWT
 *   3. Store JWT in chrome.storage.local
 *   4. On every API call, attach JWT in Authorization header
 */
import { API_BASE_URL, API_TIMEOUT_MS } from '../config.js'
import * as storageService from './storageService.js'

const TOKEN_KEY = 'auth_token'
const USER_KEY  = 'auth_user'

// ── Token storage ────────────────────────────────────────────────────────────

export async function getToken() {
  return storageService.get(TOKEN_KEY)
}

export async function getUser() {
  return storageService.get(USER_KEY)
}

export async function isLoggedIn() {
  const token = await getToken()
  return Boolean(token)
}

async function saveSession(token, user) {
  await storageService.set(TOKEN_KEY, token)
  await storageService.set(USER_KEY, user)
}

export async function clearSession() {
  await storageService.set(TOKEN_KEY, null)
  await storageService.set(USER_KEY, null)
}

// ── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * Launch Google OAuth popup and sign in.
 * Returns { token, user } on success.
 * Throws on failure or user cancellation.
 */
export async function signInWithGoogle() {
  // 1. Get Google access token via Chrome identity API
  const googleToken = await new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else if (!token) {
        reject(new Error('No token returned'))
      } else {
        resolve(token)
      }
    })
  })

  // 2. Exchange for SmartEGE JWT
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: googleToken, tokenType: 'access' }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Auth failed: ${res.status}`)
  }

  const { token, user } = await res.json()
  await saveSession(token, user)
  return { token, user }
}

/**
 * Sign out: clear local session. The JWT is stateless so no server call needed.
 */
export async function signOut() {
  const token = await getToken()

  // Optionally revoke Google token
  if (token) {
    chrome.identity.removeCachedAuthToken({ token }, () => {})
  }

  await clearSession()
}

// ── Authenticated fetch ───────────────────────────────────────────────────────

/**
 * Fetch wrapper that automatically attaches the JWT header.
 * Clears session on 401 (token expired).
 */
export async function authFetch(url, options = {}) {
  const token = await getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(url, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(API_TIMEOUT_MS),
  })

  if (res.status === 401) {
    await clearSession()
  }

  return res
}
