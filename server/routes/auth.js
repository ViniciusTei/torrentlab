import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'torrentlab-dev-secret-change-in-production'

function getUserCount() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) reject(err)
      else resolve(row.count)
    })
  })
}

function findUser(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

function createUser(username, password_hash) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, password_hash], function(err) {
      if (err) reject(err)
      else resolve(this.lastID)
    })
  })
}

// GET /api/auth/me
router.get('/auth/me', (req, res) => {
  getUserCount().then(count => {
    if (count === 0) return res.json({ firstRun: true })

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return res.json({ authenticated: false })

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      res.json({ authenticated: true, username: payload.username })
    } catch {
      res.json({ authenticated: false })
    }
  }).catch(err => res.status(500).json({ error: err.message }))
})

// POST /api/auth/setup  — only works when no users exist
router.post('/auth/setup', async (req, res) => {
  try {
    const count = await getUserCount()
    if (count > 0) return res.status(403).json({ error: 'Setup already completed' })

    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const password_hash = await bcrypt.hash(password, 12)
    await createUser(username, password_hash)

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const user = await findUser(username)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { JWT_SECRET }
export default router
