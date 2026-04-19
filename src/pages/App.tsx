import HomePageList from '@/components/home-list'
import { Skeleton } from '@/components/ui/skeleton'
import useServices from '@/services/useServices'

function App() {
  const { useHomePageData } = useServices()
  const { data } = useHomePageData()

  if (!data) {
    return (
      <div className="py-4">
        {[0, 1, 2].map(section => (
          <div key={section} className="mb-8">
            <Skeleton className="max-w-xs h-8 mb-4 mt-6" />
            <div className="flex gap-2 items-center overflow-hidden">
              {[0, 1, 2, 3, 4].map(val => (
                <Skeleton key={val} className="min-w-[226px] h-[385px] flex-shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const { trending, movies, tvShows } = data

  return (
    <div className="flex flex-col min-h-screen py-4">
      {trending && (
        <HomePageList title="Todos em destaque" data={trending} browseType="all" />
      )}

      {movies && (
        <HomePageList title="Filmes em destaque" data={movies} browseType="movie" />
      )}

      {tvShows && (
        <HomePageList title="Séries em destaque" data={tvShows} browseType="tv" />
      )}
    </div>
  )
}

export default App
