import React from 'react'
import MovieAPI from '../../../services/api'
import { torrentFactory } from '../../../services/torrents'
import { formatBytes } from '../../../utils/formatters'
import { FaDownload } from 'react-icons/fa'
import Link from 'next/link'

interface MoviePageProps {
  movie: string
}

async function MoviePage({ params }: { params: MoviePageProps }) {
  const api = MovieAPI()
  const results = await api.fetchMovieDetails(Number(params.movie))
  const downloads = await torrentFactory({ type: "movie", imdb_id: results.imdb_id })

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
          <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4" role="alert">
            <p className="font-bold">Sem downloads</p>
            <p>Ainda não foram encontrados torrents disponíveis para essa mídia.</p>
          </div>
        )}

      </section>
    </div>
  )
}

export default MoviePage
