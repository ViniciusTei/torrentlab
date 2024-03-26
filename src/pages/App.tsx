import HomePageList from '@/components/home-list'
import { Skeleton } from '@/components/ui/skeleton'
import useServices from '@/services/useServices'

function App() {
  const { useHomePageData } = useServices()
  const { data } = useHomePageData()

  if (!data) {
    return (
      <>
        <Skeleton className="max-w-[426px] h-8 mx-8 my-4" />
        <div className="flex gap-2 pl-8 items-center">
          {[0, 1, 2, 3, 4].map(val => (
            <Skeleton key={val} className="min-w-[226px] h-[385px]" />
          ))}
        </div>
        <Skeleton className="max-w-[426px] h-8 mx-8 my-4" />
        <div className="flex gap-2 pl-8 items-center">
          {[0, 1, 2, 3, 4].map(val => (
            <Skeleton key={val} className="min-w-[226px] h-[385px]" />
          ))}
        </div>
      </>
    )
  }

  const { trending, movies, tvShows } = data

  return (
    <div className="flex flex-col items-center min-h-screen">
      {trending && (
        <HomePageList title="Todos em destaque" data={trending} />
      )}

      {movies && (
        <HomePageList title="Filmes em destaque" data={movies} />
      )}

      {tvShows && (
        <HomePageList title="Tv em destaque" data={tvShows} />
      )}
    </div>
  )
}

export default App
