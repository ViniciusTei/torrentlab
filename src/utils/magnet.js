export default function createMagnetLink(torretHash, movieName) {
  const encodedName = encodeURI(movieName)
  return `magnet:?xt=urn:btih:${torretHash}&dn=${encodedName}`
}