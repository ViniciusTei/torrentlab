import { Link } from 'react-router-dom'
import { FaPeopleArrows } from 'react-icons/fa'
import { LuFileDown, LuTimerReset } from 'react-icons/lu'
import { useQuery } from '@tanstack/react-query'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import MovieItem from '@/components/movie-item'
import { useSocketContext, DownloadItem } from '@/context/sockets'
import getAPI from '@/services/api'
import { TheMovieDbTrendingType } from '@/services/types/themoviedb'
import { formatBytes, formatDuration } from '@/utils/format'

export default function DownloadsPage() {
  return (
    <div className="text-white px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Baixados</h1>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Em andamento</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <ActiveTab />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <CompletedTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ActiveTab() {
  const { activeDownloads } = useSocketContext()

  if (activeDownloads.length === 0) {
    return (
      <Alert>
        <AlertTitle>Nenhum download em andamento.</AlertTitle>
        <AlertDescription>Inicie um download a partir da página de um filme.</AlertDescription>
      </Alert>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {activeDownloads.map(item => (
        <li key={item.itemId}>
          <ActiveDownloadCard item={item} />
        </li>
      ))}
    </ul>
  )
}

function ActiveDownloadCard({ item }: { item: DownloadItem }) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-800 rounded-lg">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{item.title}</p>
        {item.infoHash !== '' && (
          <Link
            to={`/player/${item.infoHash}?title=${encodeURIComponent(item.title)}`}
            className="inline-flex items-center gap-1 bg-white text-black text-sm font-semibold px-3 py-1 rounded hover:bg-gray-200 transition-colors"
          >
            ▶ Assistir
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Progress value={item.progress * 100} className="h-2 flex-1" />
        <span className="text-sm text-slate-400">{Math.round(item.progress * 100)}%</span>
      </div>
      <div className="flex gap-4 text-sm text-slate-400">
        <span className="inline-flex items-center gap-1">
          <FaPeopleArrows /> {item.peers} peers
        </span>
        <span className="inline-flex items-center gap-1">
          <LuFileDown /> {formatBytes(item.downloaded)}/{formatBytes(item.size)}
        </span>
        <span className="inline-flex items-center gap-1">
          <LuTimerReset />
          {item.timeRemaining > 0 ? formatDuration(item.timeRemaining) : '—'}
        </span>
      </div>
    </div>
  )
}

function CompletedTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['downloads'],
    queryFn: () => getAPI().fetchDownloaded(),
  })
  const { data: downloadIds } = useQuery({
    queryKey: ['download-ids'],
    queryFn: () => getAPI().fetchDownloadIds(),
  })

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[226px] h-[385px] rounded" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertTitle>Nenhum download concluído ainda.</AlertTitle>
        <AlertDescription>Os filmes baixados aparecerão aqui.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {data.map(movie => {
        const row = downloadIds?.find(d => d.the_movie_db_id === movie.id && d.downloaded !== 0)
        return (
          <div key={movie.id} className="relative">
            <MovieItem item={movie as TheMovieDbTrendingType} />
            {row && (
              <Link
                to={`/player/${row.info_hash}?title=${encodeURIComponent(movie.title ?? '')}`}
                className="absolute top-2 left-0 right-0 mx-auto w-fit inline-flex items-center gap-1 bg-white text-black text-xs font-semibold px-3 py-1 rounded hover:bg-gray-200 transition-colors z-10"
              >
                ▶ Assistir
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
