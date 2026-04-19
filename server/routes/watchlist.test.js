import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import sqlite3 from 'sqlite3'
import { getItems, addItem, removeItem } from './watchlist.js'

let db

before(async () => {
  db = new (sqlite3.verbose().Database)(':memory:')
  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE watchlist (
        username        TEXT    NOT NULL,
        the_movie_db_id INTEGER NOT NULL,
        media_type      TEXT    NOT NULL CHECK (media_type IN ('movie', 'tv')),
        added_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (username, the_movie_db_id)
      )
    `, err => err ? reject(err) : resolve())
  })
})

after(async () => {
  await new Promise(resolve => db.close(resolve))
})

test('getItems returns empty array for new user', async () => {
  const items = await getItems('alice', db)
  assert.deepEqual(items, [])
})

test('addItem inserts a movie entry', async () => {
  await addItem('alice', 550, 'movie', db)
  const items = await getItems('alice', db)
  assert.equal(items.length, 1)
  assert.equal(items[0].the_movie_db_id, 550)
  assert.equal(items[0].media_type, 'movie')
})

test('addItem is idempotent — INSERT OR IGNORE', async () => {
  await addItem('alice', 550, 'movie', db)
  const items = await getItems('alice', db)
  assert.equal(items.length, 1)
})

test('removeItem deletes the entry', async () => {
  await removeItem('alice', 550, db)
  const items = await getItems('alice', db)
  assert.deepEqual(items, [])
})

test('getItems is isolated by username', async () => {
  await addItem('alice', 100, 'tv', db)
  await addItem('bob', 200, 'movie', db)
  const aliceItems = await getItems('alice', db)
  const bobItems = await getItems('bob', db)
  assert.equal(aliceItems.length, 1)
  assert.equal(aliceItems[0].the_movie_db_id, 100)
  assert.equal(bobItems.length, 1)
  assert.equal(bobItems[0].the_movie_db_id, 200)
})
