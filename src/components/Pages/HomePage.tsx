'use client'
import { useState } from 'react'
import MovieItem from '../MovieItem'
import SearchInput from '../Search'

interface HomePageProps {
  data: any | undefined
}

function HomePage({ data }: HomePageProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchItem, setSearchItem] = useState()

  const isPreviousData = false
  return (
    <div>
	<h1>Buscar filmes para baixar</h1>
        
        <SearchInput onSearchChange={(s) => {
          setCurrentPage(1)
          setSearchItem(s)
        }} />

        <div>

          <span>Current Page: {currentPage}</span>
          <button
            onClick={() => setCurrentPage(old => Math.max(old - 1, 0))}
            disabled={currentPage === 1}
            >
            Previous Page
          </button>{' '}
          <button
            onClick={() => {
              if (!isPreviousData && (currentPage !== data?.lastPage)) {
                setCurrentPage(old => old + 1)
              }
            }}
            // Disable the Next Page button until we know a next page is available
            disabled={isPreviousData || !(currentPage !== data?.lastPage)}
            >
            Next Page
          </button>
        </div>

        {!data ? (
          <div>Carregando...</div>
        ) : (
          <div className={styles.grid}>
            {data && data.movies.length > 0 && data.movies.map(movie => (
              <MovieItem key={movie.id} movie={movie} />
            ))}
          </div>
        )}
        
</div>
  )
}

export default HomePage
