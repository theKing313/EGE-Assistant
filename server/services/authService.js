/**
 * authService.js — Google ID token verification + JWT issuance.
 *
 * Flow:
 *   1. Extension calls chrome.identity.getAuthToken (OAuth2 implicit flow)
 *   2. Extension sends the access token to POST /api/auth/google
 *   3. We verify it against Google's tokeninfo endpoint
 *   4. We upsert the user in our DB and return a signed JWT
 */
import jwt from 'jsonwebtoken'
import * as userRepository from '../repositories/userRepository.js'
import * as subscriptionRepository from '../repositories/subscriptionRepository.js'

const JWT_SECRET = process.env.SESSION_SECRET || 'smartege-dev-secret-change-in-prod'
const JWT_EXPIRES_IN = '30d'
const GOOGLE_TOKENINFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo'

/**
 * Verify a Google OAuth access token and return user info.
 */
export async function verifyGoogleToken(accessToken) {
  const url = `${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`Google tokeninfo failed: ${res.status}`)
  }
  const data = await res.json()
  if (!data.sub || !data.email) {
    throw new Error('Invalid Google token: missing sub or email')
  }
  return {
    googleId: data.sub,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    avatar: data.picture || null,
  }
}

/**
 * Verify a Google ID token (for web-based OAuth code flow).
 */
export async function verifyGoogleIdToken(idToken) {
  const url = `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`Google tokeninfo failed: ${res.status}`)
  }
  const data = await res.json()
  if (!data.sub || !data.email) {
    throw new Error('Invalid Google ID token: missing sub or email')
  }
  return {
    googleId: data.sub,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    avatar: data.picture || null,
  }
}

/**
 * Upsert user from verified Google info, ensure subscription row exists,
 * and return a signed JWT.
 */
export async function loginOrRegister(googleInfo) {
  const user = await userRepository.upsert(googleInfo)

  // Ensure a subscription row exists (defaults to free)
  const existing = await subscriptionRepository.findByUserId(user.id)
  if (!existing) {
    await subscriptionRepository.upsert(user.id, {
      plan: 'free',
      status: 'active',
      aiLimitPerDay: 20,
      expiresAt: null,
    })
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  return { token, user: safeUser(user) }
}

/**
 * Verify a JWT and return the decoded payload.
 */
export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET)
}

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.created_at,
  }
}
