import { Metadata } from 'next'

import HomePageList from '../components/HomePageList'
import styles from '../styles/Home.module.css'

export const metadata: Metadata = {
  title: 'Torrent Lab',
  description: 'Search and Download movies',
  viewport: 'width=device-width, initial-scale=1"',
  icons: '/favicon.ico'

}

export default async function Home() {
  return (
  <main className={styles.main}>
    <HomePageList /> 
  </main>
  )
}

