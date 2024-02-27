import React from 'react'
import MovieAPI from '../../../services/api'
import Torrents from '../../../services/torrents'
import { formatBytes } from '../../../utils/formatters'
import { FaDownload } from 'react-icons/fa'
import Link from 'next/link'
import Alert from 'src/ui/alert'

interface MoviePageProps {
  movie: string
}

async function MoviePage({ params }: { params: MoviePageProps }) {
  const api = MovieAPI()
  const results = await api.fetchMovieDetails(Number(params.movie))
  const downloads = await Torrents({ type: "movie", imdb_id: results.imdb_id })

  return (
    <div className="text-white">
      <div className="flex gap-1 items-end relative min-w-[800px] w-fit mx-auto">
        <img src={results.images.poster_paths.lg} alt="Poster detail image" className="w-52 h-72" />
        <div>
          <p className="font-semibold text-3xl">{results.title}</p>
          <div className="my-1 text-lg font-semibold">
            {results.genres.join(",")} • {results.release_date}
          </div>
        </div>
      </div>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Descrição</h2>
        <p>{results.overview}</p>
      </section>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Downloads</h2>
        <ul>
          {downloads && downloads.map(item => (
            <li key={item.guid} className="my-2">
              <Link href={item.link} className="flex items-center justify-start gap-2">
                <FaDownload /> <p> {item.title} / {formatBytes(item.size)} </p>
              </Link>
            </li>
          ))}
        </ul>
        {!downloads || downloads.length === 0 && (
          <Alert
            title="Sem downloads"
            message="Ainda não foram encontrados torrents disponíveis para essa mídia."
          />
        )}

      </section>
    </div>
  )
}

export default MoviePage
