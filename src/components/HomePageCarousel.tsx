import { fetchAllTrending } from '../services/movies'

import HomePageCarouselDisplay from './HomePageCarouselDisplay'

async function HomePageCarousel() {
  const data = await fetchAllTrending() 
  
  if (!data) {
    return <div>Carregando...</div>
  }

  return (
    <HomePageCarouselDisplay data={data} />
  )
}

export default HomePageCarousel
