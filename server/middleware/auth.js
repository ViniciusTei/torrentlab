import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../routes/auth.js'

export default function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  const raw = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.token

  if (!raw) return res.status(401).json({ error: 'Authentication required' })

  try {
    req.user = jwt.verify(raw, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
