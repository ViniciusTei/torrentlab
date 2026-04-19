import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractQuality } from './utils.js'

test('1080p WEB-DL x264', () => {
  assert.equal(extractQuality('Movie.2023.1080p.WEB-DL.x264-GROUP'), '1080p WEB-DL x264')
})

test('4K BluRay HEVC', () => {
  assert.equal(extractQuality('Movie.2023.2160p.BluRay.x265-GROUP'), '4K BluRay HEVC')
})

test('720p WEBRip', () => {
  assert.equal(extractQuality('Movie.2023.720p.WEBRip'), '720p WEBRip')
})

test('UHD maps to 4K', () => {
  assert.equal(extractQuality('Movie.2023.UHD.BluRay.HEVC'), '4K BluRay HEVC')
})

test('returns null for unknown name', () => {
  assert.equal(extractQuality('some-random-file'), null)
})

test('returns null for null input', () => {
  assert.equal(extractQuality(null), null)
})

test('case insensitive matching', () => {
  assert.equal(extractQuality('movie.1080P.web-dl.X264'), '1080p WEB-DL x264')
})
