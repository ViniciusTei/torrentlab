import React from 'react'
import { Metadata } from 'next'
import '../styles/global.css'

import NavHeader from '../components/NavHeader'

interface RootLayoutProps {
  children: React.ReactNode
}

export const metadata: Metadata = {
  title: 'TorrentLab',
  description: 'A place to brwose your torrent to download.'
}

function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <NavHeader/>
        {children}
      </body>
    </html>
  )
}

export default RootLayout
