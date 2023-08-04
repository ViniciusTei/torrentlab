import MovieAPI from '../services/movies'

import HomePageCarouselDisplay from './HomePageCarouselDisplay'

async function HomePageCarousel() {
  const api = MovieAPI()
  const data = await api.fetchAllTrending() 
  
  if (!data) {
    return <div>Carregando...</div>
  }

  return (
    <HomePageCarouselDisplay data={data} />
  )
}

export default HomePageCarousel
