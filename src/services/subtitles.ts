import axios, { AxiosInstance } from 'axios'
import { SubtitleDownloadResponse, SubtitlesResponse } from './types/subtitles'
import env from 'src/utils/env'

class SubtitlesApi {
  private baseApi: AxiosInstance
  private token: string

  constructor() {
    this.baseApi = axios.create({
      baseURL: 'https://api.opensubtitles.com/api/v1',
      headers: {
        'Api-Key': env.SUBTITLES_KEY,
        'User-Agent': 'torrentlab v0.0.1'
      }
    })
  }

  public searchForSubtitles(tmdb_id: number) {
    return this.baseApi.get<SubtitlesResponse>('/subtitles', {
      params: {
        tmdb_id,
        languages: 'pt-br',
      }
    })
  }

  public async download(file_id: number) {
    const bearer = await this.login()

    return this.baseApi.post<SubtitleDownloadResponse>('/download', { file_id }, {
      headers: {
        'Authorization': `Bearer ${bearer}`,
        'Accept': '*/*',
      }
    })
  }

  private async login() {
    if (this.token) {
      return this.token
    }

    try {
      const auth = await this.baseApi.post('/login', {
        username: env.SUBTITLES_EMAIL,
        password: env.SUBTITLES_PASS,
      })

      this.token = auth.data.token
      return this.token
    } catch (error) {
      throw error
    }
  }
}

export default SubtitlesApi
