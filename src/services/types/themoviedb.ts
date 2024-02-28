import { Subtitle } from "./subtitles"

export type TheMovieDbResult = {
  id: number
  backdrop_path: string
  title: string
  original_language: string
  original_name?: string
  original_title?: string
  overview: string
  poster_path: string
  popularity: number
  release_date?: string
  first_air_date?: string
  genre_ids: number[] | undefined
  media_type: "movie" | "tv"
}

export type TheMovieDbTrendingResponse = {
  page: number
  total_page: number
  total_results: number
  results: TheMovieDbResult[]
}

export interface TheMovieDbDetailResponse extends Omit<TheMovieDbResult, 'genre_ids' | 'media_type'> {
  genres: { id: number, name: string }[]
  imdb_id: string
}

export interface TheMovieDbTrendingType {
  id: number
  title: string
  overview: string
  release_date: string
  popularity: number
  is_movie: boolean
  images: {
    backdrop_paths: {
      sm: string
      md: string
      lg: string
    },
    poster_paths: {
      sm: string
      md: string
      lg: string
    }
  }
  genres: string[] | undefined
}

export interface TheMovieDbDetailsType {
  id: number
  title: string
  overview: string
  release_date: string
  popularity: number
  is_movie: boolean
  images: {
    backdrop_paths: {
      sm: string
      md: string
      lg: string
    },
    poster_paths: {
      sm: string
      md: string
      lg: string
    }
  }
  genres: string[] | undefined
  imdb_id: string
  is_tv_show: boolean
  subtitles: Subtitle[] | undefined
}

