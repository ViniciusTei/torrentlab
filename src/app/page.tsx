import { Metadata } from 'next'

import HomePageList from '../components/HomePageList'
import HomePageCarousel from '../components/HomePageCarousel'
import MovieAPI from '../services/api'

export const metadata: Metadata = {
  title: 'Torrent Lab',
  description: 'Search and Download movies',
  viewport: 'width=device-width, initial-scale=1"',
  icons: '/favicon.ico'

}

export default async function Home() {
  const api = MovieAPI()
  const response = await api.fetchTrendingMovies() 
  const responseAllTrending = await api.fetchAllTrending()
  const responseTvTrending = await api.fetchTrendingTvShows()

  return (
    <main className="flex flex-col items-center min-h-screen">
      <HomePageCarousel />
      <HomePageList title="Em destaque" data={responseAllTrending} /> 
      <HomePageList title="Filmes recentes" data={response} /> 
      <HomePageList title="Tv recentes" data={responseTvTrending} /> 
    </main>
  )
}

