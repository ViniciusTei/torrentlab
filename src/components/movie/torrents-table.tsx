import { useQuery } from '@tanstack/react-query'
import { FaDownload } from 'react-icons/fa'

import { useSocketContext } from '@/context/sockets'
import Torrents, { JackettItem } from '@/services/torrents'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatBytes } from '@/utils/format'

interface Props {
  imdb_id: string
  movieId: number
}

function parseQuality(title: string): string {
  if (/2160p|4K/i.test(title)) return '4K Ultra HD'
  if (/1080p/i.test(title)) return '1080p'
  if (/720p/i.test(title)) return '720p'
  if (/480p/i.test(title)) return '480p'
  return '—'
}

function parseFormat(title: string): string {
  if (/blu.?ray|bluray/i.test(title)) return 'Blu-ray'
  if (/WEB-DL/i.test(title)) return 'WEB-DL'
  if (/WEBRip/i.test(title)) return 'WEBRip'
  if (/HDTV/i.test(title)) return 'HDTV'
  if (/DVDRip/i.test(title)) return 'DVDRip'
  return '—'
}

function TorrentRow({ item, movieId }: { item: JackettItem; movieId: number }) {
  const { activeDownloads, startDownload } = useSocketContext()
  const active = activeDownloads.find(i => i.itemId === item.guid)
  const pending = !!active

  function handleDownload() {
    startDownload({
      magnet: item.magneturl ?? (Array.isArray(item.link) ? item.link[0] : item.link),
      itemId: item.guid,
      theMovieDbId: movieId,
      title: item.title,
      size: item.size,
    })
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 text-sm font-medium">{parseQuality(item.title)}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{parseFormat(item.title)}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">{formatBytes(item.size)}</td>
      <td className="py-3 pr-4 text-sm whitespace-nowrap">
        <span className="text-green-600">{item.seeders ?? '—'}</span>
        <span className="text-muted-foreground mx-0.5">/</span>
        <span className="text-red-500">{item.leechers ?? '—'}</span>
      </td>
      <td className="py-3">
        {pending ? (
          <div className="flex items-center gap-2 min-w-[180px]">
            <Progress value={(active?.progress ?? 0) * 100} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatBytes(active?.downloaded ?? 0)}/{formatBytes(item.size)}
            </span>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <FaDownload className="mr-1.5" /> Baixar
          </Button>
        )}
      </td>
    </tr>
  )
}

export default function TorrentsTable({ imdb_id, movieId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['torrents', imdb_id],
    queryFn: () => Torrents({ type: 'movie', imdb_id }),
  })

  return (
    <section id="torrents" className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Torrents Disponíveis</h2>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <Alert variant="destructive">
          <AlertTitle>Sem downloads</AlertTitle>
          <AlertDescription>Nenhum torrent disponível para essa mídia.</AlertDescription>
        </Alert>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">Qualidade</th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">Formato</th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">Tamanho</th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">S/L</th>
                <th className="pb-2 text-xs text-muted-foreground uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <TorrentRow key={item.guid} item={item} movieId={movieId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
