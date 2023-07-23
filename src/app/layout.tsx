import React from 'react'
import { Metadata } from 'next'
import '@/styles/global.css'

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
      <body>{children}</body>
    </html>
  )
}

export default RootLayout
