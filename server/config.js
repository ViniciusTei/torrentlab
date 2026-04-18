const config = {
  tmdbToken: process.env.TMDB_TOKEN || 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZGNlNTk5NGFkMmE1NWU2YjJhMGYxNmZlYmUxOWIxYyIsInN1YiI6IjYwNWY1YTE5ZDJmNWI1MDA1MzkzY2Y2MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.CoEO3sS5wJAnI_GQmsPpbX924zQeBQzmmhuk9z26d3c',
  omdbApiKey: process.env.OMDB_API_KEY || '6c3ebf7c',
  jackettUrl: process.env.JACKETT_URL || 'http://localhost:9117',
  jackettApiKey: process.env.JACKETT_API_KEY || 'sopqxl8kcm4j0fe7atq4tevsc4kg9kgd',
  subtitlesEmail: process.env.SUBTITLES_EMAIL || '',
  subtitlesPass: process.env.SUBTITLES_PASS || '',
  subtitlesKey: process.env.SUBTITLES_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  port: parseInt(process.env.PORT || '5174'),
  downloadsPath: process.env.DOWNLOADS_PATH || 'downloads',
  metadataPath: process.env.METADATA_PATH || 'metadata',
}

export default config
