import db from './db.js'

function dbGet(sql, params) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)))
}

/**
 * Wraps any async fetch with a SQLite-backed TTL cache.
 * key        — unique string cache key
 * ttlSeconds — how long to consider the cached value fresh
 * fetchFn    — async () => value, called on cache miss
 */
export async function withCache(key, ttlSeconds, fetchFn) {
  const now = Math.floor(Date.now() / 1000)
  const cached = await dbGet('SELECT * FROM api_cache WHERE cache_key = ?', [key])
  if (cached && (now - cached.cached_at) < ttlSeconds) {
    return JSON.parse(cached.response)
  }
  const result = await fetchFn()
  db.run(
    'INSERT OR REPLACE INTO api_cache (cache_key, response, cached_at) VALUES (?, ?, ?)',
    [key, JSON.stringify(result), now],
    (err) => { if (err) console.error('[api-cache] write error:', err.message) }
  )
  return result
}
