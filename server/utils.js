/**
 * Extracts a short quality string from a torrent name.
 * Returns null if no known tokens are found.
 * @param {string | null} name
 * @returns {string | null}
 */
export function extractQuality(name) {
  if (!name) return null
  const tokens = []

  if (/\b(2160p|4K|UHD)\b/i.test(name)) tokens.push('4K')
  else if (/\b1080p\b/i.test(name)) tokens.push('1080p')
  else if (/\b720p\b/i.test(name)) tokens.push('720p')
  else if (/\b480p\b/i.test(name)) tokens.push('480p')

  if (/\bBlu[-.]?Ray\b/i.test(name)) tokens.push('BluRay')
  else if (/\bWEB[-.]?DL\b/i.test(name)) tokens.push('WEB-DL')
  else if (/\bWEBRip\b/i.test(name)) tokens.push('WEBRip')
  else if (/\bHDTV\b/i.test(name)) tokens.push('HDTV')

  if (/\b(x265|HEVC)\b/i.test(name)) tokens.push('HEVC')
  else if (/\b(x264|AVC)\b/i.test(name)) tokens.push('x264')

  return tokens.length > 0 ? tokens.join(' ') : null
}
