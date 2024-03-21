import { useQuery } from '@tanstack/react-query'
import getAPI from './api'
import Torrents, { JackettItem } from './torrents'
import { TheMovieDbDetailsType } from './types/themoviedb'

export type MovieDetails = {
  movies: TheMovieDbDetailsType
  downloads: JackettItem[]
}

export default function useServices() {
  const api = getAPI()

  function useAllTrending() {
    return useQuery({
      queryKey: ['trending-movies'],
      queryFn: async () => {
        const response = await api.fetchAllTrending()
        return response
      }
    })
  }

  function useMovieDetails(movie: number) {
    return useQuery({
      queryKey: ['movie-detail', movie],
      queryFn: async () => {
        try {
          const results = await api.fetchMovieDetails(movie)
          const downloads = await Torrents({ type: "movie", imdb_id: results.imdb_id })
          return {
            movies: results,
            downloads
          } as MovieDetails
        } catch (error) {
          throw error
        }
      },
    })
  }

  return { useAllTrending, useMovieDetails }
}
