import { Metadata } from 'next'

import HomePageList from '../components/HomePageList'
import HomePageCarousel from '../components/HomePageCarousel'
import { fetchMovieData } from '../services/movies'

export const metadata: Metadata = {
  title: 'Torrent Lab',
  description: 'Search and Download movies',
  viewport: 'width=device-width, initial-scale=1"',
  icons: '/favicon.ico'

}

export default async function Home() {
  const movies = await fetchMovieData(15, 1, undefined)
  return (
    <main className="flex flex-col items-center min-h-screen">
      <HomePageCarousel />
      <HomePageList title="Continue assistindo" data={movies} /> 
      <HomePageList title="Filmes recentes" data={movies} /> 
    </main>
  )
}

