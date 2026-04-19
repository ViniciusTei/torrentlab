import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.sql')

const sql = sqlite3.verbose()
const db = new sql.Database(DB_PATH)

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS downloads (
      download_id TEXT PRIMARY KEY,
      info_hash TEXT NOT NULL,
      the_movie_db_id INTEGER,
      downloaded INTEGER NOT NULL CHECK (downloaded IN (0, 1))
    );
  `)
  // Migration: add title column if it doesn't exist yet
  db.run(`ALTER TABLE downloads ADD COLUMN title TEXT`, () => {})
  db.run(`ALTER TABLE downloads ADD COLUMN size INTEGER`, () => {})
  db.run(`ALTER TABLE downloads ADD COLUMN quality TEXT`, () => {})
  db.run(`ALTER TABLE downloads ADD COLUMN torrent_name TEXT`, () => {})
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS torrent_cache (
      cache_key TEXT PRIMARY KEY,
      results   TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      response  TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `)
})

export default db
