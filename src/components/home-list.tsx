import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TheMovieDbTrendingType } from '@/services/types/themoviedb'
import MovieItem from './movie-item'

interface Props {
  title: string
  data: TheMovieDbTrendingType[]
}

function HomePageList({ title, data }: Props) {
  const displayData = data

  return (
    <div className="w-full max-w-full overflow-hidden min-h-fit px-4">
      <h2 className="text-3xl capitalize mb-4 mt-6">{title}</h2>
      <ScrollArea className="w-full whitespace-nowrap py-4" >
        <div className="flex items-center gap-2 w-full">
          {displayData && displayData.length > 0 && displayData.map(movie => (
            <MovieItem key={movie.id} item={movie} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export default HomePageList
