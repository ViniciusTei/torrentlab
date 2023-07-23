import MovieItem from './MovieItem'
import SearchInput from './Search'
import { fetchMovieData } from '../services/movies'
import styles from '../styles/Home.module.css'

async function HomePageList() {
  const data = await fetchMovieData(30, 1, undefined) 

  return (  
    <div>
      <h1>Buscar filmes para baixar</h1>
        
      <SearchInput/>

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

export default HomePageList
