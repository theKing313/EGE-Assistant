/**
 * routes/auth.js
 *
 * POST /api/auth/google   — verify Google access token, return JWT
 * GET  /api/auth/me       — return current user (requires JWT)
 * POST /api/auth/logout   — client-side only (JWT is stateless), returns 200
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as authService from '../services/authService.js'
import * as userRepository from '../repositories/userRepository.js'

const router = Router()

/**
 * POST /api/auth/google
 * Body: { token: <Google access token OR id_token>, tokenType: 'access'|'id' }
 */
router.post('/google', async (req, res) => {
  const { token, tokenType = 'access' } = req.body

  if (!token) {
    return res.status(400).json({ error: 'token is required' })
  }

  try {
    let googleInfo
    if (tokenType === 'id') {
      googleInfo = await authService.verifyGoogleIdToken(token)
    } else {
      googleInfo = await authService.verifyGoogleToken(token)
    }

    const result = await authService.loginOrRegister(googleInfo)
    console.log(`[Auth] Login: ${result.user.email}`)
    res.json(result)
  } catch (err) {
    console.error('[Auth] Google verification failed:', err.message)
    res.status(401).json({ error: 'Google authentication failed', detail: err.message })
  }
})

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err) {
    console.error('[Auth] /me error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/auth/logout
 * JWT is stateless — actual logout happens by deleting the token on the client.
 * This endpoint exists for future token blacklisting if needed.
 */
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ message: 'Logged out' })
})

export default router
