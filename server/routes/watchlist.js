import express from 'express'
import defaultDb from '../db.js'

const router = express.Router()

function getItems(username, db = defaultDb) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT the_movie_db_id, media_type, added_at FROM watchlist WHERE username = ? ORDER BY added_at DESC',
      [username],
      (err, rows) => err ? reject(err) : resolve(rows)
    )
  })
}

function addItem(username, the_movie_db_id, media_type, db = defaultDb) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO watchlist (username, the_movie_db_id, media_type) VALUES (?, ?, ?)',
      [username, the_movie_db_id, media_type],
      err => err ? reject(err) : resolve()
    )
  })
}

function removeItem(username, the_movie_db_id, db = defaultDb) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM watchlist WHERE username = ? AND the_movie_db_id = ?',
      [username, the_movie_db_id],
      err => err ? reject(err) : resolve()
    )
  })
}

// GET /api/watchlist
router.get('/watchlist', async (req, res) => {
  try {
    const items = await getItems(req.user.username)
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/watchlist
router.post('/watchlist', async (req, res) => {
  const { the_movie_db_id, media_type } = req.body
  if (!the_movie_db_id || !['movie', 'tv'].includes(media_type)) {
    return res.status(400).json({ error: 'the_movie_db_id and media_type (movie|tv) required' })
  }
  try {
    await addItem(req.user.username, the_movie_db_id, media_type)
    res.status(201).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/watchlist/:the_movie_db_id
router.delete('/watchlist/:the_movie_db_id', async (req, res) => {
  try {
    await removeItem(req.user.username, Number(req.params.the_movie_db_id))
    res.sendStatus(204)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { getItems, addItem, removeItem }
export default router
