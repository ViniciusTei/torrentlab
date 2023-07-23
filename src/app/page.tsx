import { Metadata } from 'next'

import HomePageList from '../components/HomePageList'

export const metadata: Metadata = {
  title: 'Torrent Lab',
  description: 'Search and Download movies',
  viewport: 'width=device-width, initial-scale=1"',
  icons: '/favicon.ico'

}

export default async function Home() {
  return (
  <main className="flex flex-col items-center min-h-screen">
    <HomePageList /> 
  </main>
  )
}

