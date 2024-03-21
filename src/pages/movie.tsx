import { useLoaderData } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SubtitleItem from '@/components/subtitle-item';
import DownloadItem from '@/components/download-item';
import { MovieDetails } from '@/services/useServices';
import getAPI from '@/services/api'
import Torrents from '@/services/torrents'

interface Params {
  data: MovieDetails
}

function movie() {
  const { data } = useLoaderData() as Params

  if (!data) return null
  const { movies, downloads } = data

  return (
    <div className="text-white">
      <div className="flex gap-1 items-end relative min-w-[800px] w-fit mx-auto">
        <img src={movies.images.poster_paths.lg} alt="Poster detail image" className="w-52 h-72" />
        <div>
          <p className="font-semibold text-3xl">{movies.title}</p>
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
        <ul>
          {downloads && downloads.map(item => (
            <li key={item.guid} className="my-2">
              <DownloadItem item={item} />
            </li>
          ))}
        </ul>
        {!downloads || downloads.length === 0 && (
          <Alert variant="destructive">
            <AlertTitle>Sem downloads</AlertTitle>
            <AlertDescription>Ainda não foram encontrados torrents disponíveis para essa mídia.</AlertDescription>
          </Alert>
        )}
      </section>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Legendas</h2>
        <ul>
          {movies.subtitles && movies.subtitles.map(item => (
            <SubtitleItem key={item.id} subtitle={item} />
          ))}
        </ul>
        {!movies.subtitles || movies.subtitles.length === 0 && (
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
  const movies = await api.fetchMovieDetails(Number(params.id))
  const downloads = await Torrents({ type: "movie", imdb_id: movies.imdb_id })

  return {
    data: {
      movies,
      downloads
    } as MovieDetails
  }
}

export default movie
