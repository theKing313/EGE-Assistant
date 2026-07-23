/**
 * routes/users.js
 *
 * GET /api/users/me        — current user profile
 * GET /api/users/me/usage  — AI usage history
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as userRepository from '../repositories/userRepository.js'
import * as usageService from '../services/usageService.js'

const router = Router()

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me/usage', requireAuth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30)
    const history = await usageService.getHistory(req.user.userId, days)
    const today = await usageService.checkLimit(req.user.userId)
    res.json({ today, history })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
