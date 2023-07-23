import { Metadata } from 'next'

import HomePage from '../components/Pages/HomePage'
import { getMovies } from '../services/movies'
import styles from '../styles/Home.module.css'

export const metadata: Metadata = {
  title: 'Torrent Lab',
  description: 'Search and Download movies',
  viewport: 'width=device-width, initial-scale=1"',
  icons: '/favicon.ico'

}

export default async function Home() {
  const { data } = await getMovies(0, undefined)
  return (
    <>
      <main className={styles.main}>
        <HomePage data={data} /> 
      </main>
    </>
  )
}

