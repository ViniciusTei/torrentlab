import axios from 'axios'

export async function getMovies(page = 1, search = '') {
  const response = await axios.get(`http://localhost:3000/api/movies?page=${page}&query_term=${search}`)
  return {
    movies: response.data.data.movies,
    page: page,
    lastPage: Math.ceil(response.data.data.movie_count/response.data.data.limit),
  }
}
