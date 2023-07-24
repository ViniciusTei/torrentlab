'use client'

import MovieItem from './MovieItem'
import { TheMovieDb } from '../services/movies'

interface Props {
  title: string
  data: TheMovieDb[]
}

function HomePageList({ title, data }: Props) {

  return (  
    <div className="w-full max-w-full overflow-hidden min-h-fit">
      <h2 className="text-3xl capitalize mb-4 mt-6">{title}</h2>
      <div className="flex items-center gap-2 w-full">
        {data && data.length > 0 && data.map(movie => (
          <MovieItem movie={movie} />
        ))}
      </div>
    </div>
  )
}

export default HomePageList
