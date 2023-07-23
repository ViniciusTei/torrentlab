import { fetchMovieData } from '../services/movies'

import HomePageCarouselDisplay from './HomePageCarouselDisplay'

async function HomePageCarousel() {
  const data = await fetchMovieData(5, 1, undefined)
  
  if (!data) {
    return <div>Carregando...</div>
  }

  return (
    <HomePageCarouselDisplay data={data} />
  )
}

export default HomePageCarousel
