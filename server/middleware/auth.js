/**
 * auth.js — JWT verification middleware.
 * Attach to any route that requires authentication.
 */
import { verifyJwt } from '../services/authService.js'

/**
 * Require a valid JWT. Puts decoded payload in req.user.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' })
  }

  const token = header.slice(7)
  try {
    req.user = verifyJwt(token)
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Optionally attach user if token present; continues even without auth.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = verifyJwt(header.slice(7))
    } catch {
      // ignore invalid tokens in optional mode
    }
  }
  next()
}
