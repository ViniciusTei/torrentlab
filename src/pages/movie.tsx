import { useLoaderData, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import SubtitleItem from '@/components/subtitle-item';
import DownloadItem from '@/components/download-item';
import { TheMovieDbDetailsType } from '@/services/types/themoviedb';
import getAPI from '@/services/api'
import Torrents from '@/services/torrents'
import { useSocketContext } from '@/context/sockets'

function TorrentsList({ imdb_id, movieId }: { imdb_id: string; movieId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['torrents', imdb_id],
    queryFn: () => Torrents({ type: 'movie', imdb_id }),
  })

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2 mt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </ul>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Sem downloads</AlertTitle>
        <AlertDescription>Ainda não foram encontrados torrents disponíveis para essa mídia.</AlertDescription>
      </Alert>
    )
  }

  return (
    <ul>
      {data.map(item => (
        <li key={item.guid} className="my-2">
          <DownloadItem theMovieDbId={movieId} item={item} />
        </li>
      ))}
    </ul>
  )
}

function movie() {
  const movies = useLoaderData() as TheMovieDbDetailsType

  const { data: downloadIds } = useQuery({
    queryKey: ['download-ids'],
    queryFn: () => getAPI().fetchDownloadIds(),
  })
  const { activeDownloads } = useSocketContext()
  const downloadRow = downloadIds?.find(d => d.the_movie_db_id === movies.id && d.downloaded !== 0)
  const activeItem = activeDownloads.find(d => d.theMovieDbId === movies.id)
  const watchInfoHash = downloadRow?.info_hash ?? activeItem?.infoHash ?? null

  return (
    <div className="text-white">
      <div className="flex gap-1 items-end relative min-w-[800px] w-fit mx-auto">
        <img src={movies.images.poster_paths.lg} alt="Poster detail image" className="w-52 h-72" />
        <div>
          <p className="font-semibold text-3xl">{movies.title}</p>
          {watchInfoHash && (
            <Link
              to={`/player/${watchInfoHash}?title=${encodeURIComponent(movies.title ?? '')}`}
              className="mt-2 inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-semibold hover:bg-gray-200 transition-colors"
            >
              ▶ Assistir
            </Link>
          )}
          <div className="my-1 text-lg font-semibold">
            {movies.genres?.join(", ")} • {movies.release_date}
          </div>
        </div>
      </div>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Descrição</h2>
        <p>{movies.overview}</p>
      </section>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Downloads</h2>
        {movies.imdb_id
          ? <TorrentsList imdb_id={movies.imdb_id} movieId={movies.id} />
          : <Alert variant="destructive">
              <AlertTitle>Sem downloads</AlertTitle>
              <AlertDescription>IMDb ID não encontrado para essa mídia.</AlertDescription>
            </Alert>
        }
      </section>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Legendas</h2>
        <ul>
          {movies.subtitles && movies.subtitles.map(item => (
            <SubtitleItem key={item.id} subtitle={item} />
          ))}
        </ul>
        {(!movies.subtitles || movies.subtitles.length === 0) && (
          <Alert variant="destructive">
            <AlertTitle>Sem legendas</AlertTitle>
            <AlertDescription>Ainda não foram encontrados legendas disponíveis para essa mídia.</AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  )
}

export async function loader({ params }: any) {
  const api = getAPI()
  return api.fetchMovieDetails(Number(params.id))
}

export default movie
