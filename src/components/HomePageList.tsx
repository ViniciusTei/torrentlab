'use client'

import { TheMovieDbTrendingType } from '../services/themoviedb'
import MovieItem from './MovieItem'

interface Props {
  title: string
  data: TheMovieDbTrendingType[]
}

function HomePageList({ title, data }: Props) {

  return (  
    <div className="w-full max-w-full overflow-hidden min-h-fit">
      <h2 className="text-3xl capitalize mb-4 mt-6">{title}</h2>
      <div className="flex items-center gap-2 w-full">
        {data && data.length > 0 && data.map(movie => (
          <MovieItem item={movie} />
        ))}
      </div>
    </div>
  )
}

export default HomePageList
