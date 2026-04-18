import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { TheMovieDbDetailsType, TheMovieDbTrendingType } from './types/themoviedb'
import { JackettItem } from './torrents'
import { SubtitleDownloadResponse } from './types/subtitles'

const http = axios.create()

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type AuthMeResponse =
  | { firstRun: true }
  | { authenticated: true; username: string }
  | { authenticated: false }

class API {
  async me(): Promise<AuthMeResponse> {
    const res = await http.get<AuthMeResponse>('/api/auth/me')
    return res.data
  }

  async login(username: string, password: string): Promise<void> {
    const res = await http.post<{ token: string }>('/api/auth/login', { username, password })
    localStorage.setItem('token', res.data.token)
  }

  async setup(username: string, password: string): Promise<void> {
    const res = await http.post<{ token: string }>('/api/auth/setup', { username, password })
    localStorage.setItem('token', res.data.token)
  }

  logout(): void {
    localStorage.removeItem('token')
  }

  async fetchDownloaded(): Promise<TheMovieDbDetailsType[]> {
    const result = await http.get<{ the_movie_db_id: number }[]>('/api/downloads')
    const downloaded: TheMovieDbDetailsType[] = []
    for (const d of result.data) {
      const detail = await this.fetchMovieDetails(d.the_movie_db_id)
      downloaded.push(detail)
    }
    return downloaded
  }

  async fetchTrendingMovies(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=movie')
    return res.data
  }

  async fetchAllTrending(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=all')
    return res.data
  }

  async fetchTrendingTvShows(): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get('/api/trending?type=tv')
    return res.data
  }

  async fetchMovieDetails(movie_id: number): Promise<TheMovieDbDetailsType> {
    try {
      const res = await http.get(`/api/movie/${movie_id}`)
      return res.data
    } catch (error) {
      if (error instanceof AxiosError) throw error
      throw new Error('Algo de errado aconteceu ao tentar buscar os detalhes do filme.')
    }
  }

  async fetchTvShowsDetails(id: number): Promise<TheMovieDbDetailsType> {
    const res = await http.get(`/api/tvshow/${id}`)
    return res.data
  }

  async searchAll(query: string): Promise<TheMovieDbTrendingType[]> {
    const res = await http.get(`/api/search?q=${encodeURIComponent(query)}`)
    return res.data
  }

  async fetchTorrents(imdb_id: string): Promise<JackettItem[]> {
    const res = await http.get<JackettItem[]>(`/api/torrents?imdb_id=${encodeURIComponent(imdb_id)}`)
    return res.data
  }

  async downloadSubtitles(file_id: number): Promise<SubtitleDownloadResponse> {
    const res = await http.post<SubtitleDownloadResponse>('/api/subtitles/download', { file_id })
    return res.data
  }

  async getSettings(): Promise<Record<string, string>> {
    const res = await http.get<Record<string, string>>('/api/settings')
    return res.data
  }

  async updateSettings(settings: Record<string, string>): Promise<void> {
    await http.put('/api/settings', settings)
  }
}

let globalAPI: API | null = null

function getAPI() {
  if (!globalAPI) globalAPI = new API()
  return globalAPI
}

export default getAPI
