import { useQuery } from '@tanstack/react-query'
import { useSocketContext } from '@/context/sockets'
import getAPI from '@/services/api'

export type DownloadStatus = 'downloading' | 'downloaded' | null

export function useDownloadStatus(movieId: number): DownloadStatus {
  const { activeDownloads } = useSocketContext()
  const { data: downloadIds } = useQuery({
    queryKey: ['download-ids'],
    queryFn: () => getAPI().fetchDownloadIds(),
  })

  if (activeDownloads.some(d => d.theMovieDbId === movieId)) return 'downloading'
  if (downloadIds?.some(d => d.the_movie_db_id === movieId && d.downloaded === 1)) return 'downloaded'
  return null
}
