import { useQuery } from '@tanstack/react-query'
import getAPI from './api'
import { JackettItem } from './torrents'
import { TheMovieDbDetailsType } from './types/themoviedb'

export type MovieDetails = {
  movies: TheMovieDbDetailsType
  downloads: JackettItem[]
}

export default function useServices() {
  const api = getAPI()

  function useHomePageData() {
    return useQuery({
      queryKey: ['home'],
      queryFn: async () => {
        const [trending, movies, tvShows] = await Promise.all([
          api.fetchAllTrending(),
          api.fetchTrendingMovies(),
          api.fetchTrendingTvShows(),
        ])
        return { trending, movies, tvShows }
      }
    })
  }

  function useAllTrending() {
    return useQuery({
      queryKey: ['trending-all'],
      queryFn: () => api.fetchAllTrending(),
    })
  }

  function useMovieDetails(movie: number) {
    return useQuery({
      queryKey: ['movie-detail', movie],
      queryFn: async () => {
        const results = await api.fetchMovieDetails(movie)
        const downloads = results.imdb_id ? await api.fetchTorrents(results.imdb_id) : []
        return { movies: results, downloads } as MovieDetails
      },
    })
  }

  return { useAllTrending, useMovieDetails, useHomePageData }
}
