import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TheMovieDbTrendingType } from '@/services/types/themoviedb'
import MovieItem from './movie-item'

interface Props {
  title: string
  data: TheMovieDbTrendingType[]
  browseType: 'all' | 'movie' | 'tv'
}

function HomePageList({ title, data, browseType }: Props) {
  return (
    <div className="w-full max-w-full overflow-hidden min-h-fit px-4">
      <div className="flex items-center justify-between mb-4 mt-6">
        <h2 className="text-3xl capitalize">{title}</h2>
        <Link
          to={`/browse/${browseType}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Ver todos
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <ScrollArea className="w-full whitespace-nowrap py-4" >
        <div className="flex items-center gap-2 w-full">
          {data.length > 0 && data.map(movie => (
            <MovieItem key={movie.id} item={movie} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export default HomePageList
