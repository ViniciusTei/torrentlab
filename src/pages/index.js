import { useState } from 'react'
import { useQuery } from 'react-query'
import Head from 'next/head'
import { Inter } from '@next/font/google'
import MovieItem from '@/components/MovieItem'
import SearchInput from '@/components/Search'
import { getMovies } from '@/services/movies'
import styles from '@/styles/Home.module.css'

const inter = Inter({ subsets: ['latin'] })

export default function Home({ movies }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchItem, setSearchItem] = useState()

  const { data, isPreviousData, isFetching } = useQuery(
    ['movies', currentPage, searchItem],
    () => getMovies(currentPage, searchItem),
    { 
      initialData: {
        movies: movies ?? [],
        page: 1,
        lastPage: 1,
      }, 
      keepPreviouData: true,
      refetchOnWindowFocus: false
    }
  )

  return (
    <>
      <Head>
        <title>Torrent Lab</title>
        <meta name="description" content="Search and Download movies" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
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

        {isFetching ? (
          <div>Carregando...</div>
        ) : (
          <div className={styles.grid}>
            {data && data.movies.length > 0 && data.movies.map(movie => (
              <MovieItem key={movie.id} movie={movie} />
            ))}
          </div>
        )}
        
      </main>
    </>
  )
}

export async function getServerSideProps(context) {
  const movies = await getMovies()
  return {
    props: {
      movies: movies
    }, // will be passed to the page component as props
  }
}
