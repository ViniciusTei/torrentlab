import MovieItem from './MovieItem'
import { MovieData } from '../services/movies'

interface Props {
  title: string
  data: MovieData[]
}

async function HomePageList({ title, data }: Props) {

  return (  
    <div className='w-full overflow-x-hidden'>
      <h2 className="text-3xl capitalize mb-4 mt-6">{title}</h2>
      <div className="flex items-center gap-2 overflow-x-hidden">
        {data && data.length > 0 && data.map(movie => (
          <MovieItem key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  )
}

export default HomePageList
