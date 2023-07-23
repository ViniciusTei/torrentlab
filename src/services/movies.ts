export async function fetchMovieData(limit: number | undefined, page: number | undefined, query_term: string | undefined) {
  const yts_uri = 'https://yts.mx/api/v2/list_movies.json'
  const url = `${yts_uri}?limit=${limit ?? 30}&page=${page ?? 1}&query_term=${query_term ?? 0}&sort_by=year`
  
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch page initial data')
  }

  return response.json()
}
