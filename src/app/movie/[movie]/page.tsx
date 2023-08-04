import React from 'react'
import MovieAPI from '../../../services/api'
import { torrentFactory } from '../../../services/torrents'

interface MoviePageProps {
  movie: string
}

async function MoviePage({ params }: { params: MoviePageProps }) {
  const api = MovieAPI()
  const results = await api.fetchMovieDetails(Number(params.movie))
  const downloads = await torrentFactory(results.title)
  
  return (
    <div className="text-white">
      <div className="flex gap-1 items-end relative min-w-[800px] w-fit mx-auto">
        <img src={results.images.poster_paths.lg} alt="Poster detail image" className="w-52 h-72"  />
        <div>
          <p className="font-semibold text-3xl">{results.title}</p>
          <div className="my-1 text-lg font-semibold">
            {results.genres.join(",")} • {results.release_date}
          </div>
        </div>
      </div>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Descricao</h2>
        <p>{results.overview}</p>
      </section>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Downloads</h2>
        <div>
         {downloads && downloads.map(item => (
            <>
              {item.title} / {item.size}
            </>
          ))} 
        </div>
      </section>
    </div>
  )
}

export default MoviePage
