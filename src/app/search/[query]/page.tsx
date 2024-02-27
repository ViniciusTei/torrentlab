import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import API from 'src/services/api'
import { TheMovieDbResult, TheMovieDbTrendingType } from 'src/services/themoviedb'
import { Badge } from 'src/ui/badge'

interface PageProps {
  params: {
    query: string
  }
}

const test = [
  {
    "id": 872585,
    "title": "Oppenheimer",
    "overview": "A história do físico americano J. Robert Oppenheimer, seu papel no Projeto Manhattan e no desenvolvimento da bomba atômica durante a Segunda Guerra Mundial, e o quanto isso mudaria a história do mundo para sempre.",
    "popularity": 430.115,
    "release_date": "18/07/2023",
    "images": {
      "backdrop_paths": {
        "sm": "http://image.tmdb.org/t/p//w300/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
        "md": "http://image.tmdb.org/t/p//original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
        "lg": "http://image.tmdb.org/t/p//w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg"
      },
      "poster_paths": {
        "sm": "http://image.tmdb.org/t/p//w92/c0DCmfC7Et2K3URnIJ4ahJpeXR2.jpg",
        "md": "http://image.tmdb.org/t/p//w185/c0DCmfC7Et2K3URnIJ4ahJpeXR2.jpg",
        "lg": "http://image.tmdb.org/t/p//w780/c0DCmfC7Et2K3URnIJ4ahJpeXR2.jpg"
      }
    },
    "genres": [
      "Drama",
      "History"
    ],
    "is_movie": true
  }
] as TheMovieDbTrendingType[]

async function SearchPage({ params }: PageProps) {
  // const api = API()
  // const searchResults = await api.searchAll(params.query)
  return (
    <main className="w-full h-full px-12 py-4 inline-flex gap-6">
      <div className="hidden md:block max-w-xs rounded-lg bg-slate-500">
        <div className="bg-slate-900 text-white rounded-t-lg py-3 px-6 text-start">
          <h1 className="font-semibold text-base">Resultados da busca:</h1>
          <p className="text-sm">"Busca aqui"</p>
        </div>
        <div className="w-full">
          <ul className="w-full py-4 px-8">
            <li className="flex justify-between mb-2">
              <p>Filmes</p>
              <Badge>1</Badge>
            </li>
            <li className="flex justify-between">
              <p>Series</p>
              <Badge>1</Badge>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-1">
        {test.map(item => (
          <div className="bg-slate-500 w-full rounded-lg p-4 flex gap-2">
            <Image className="rounded-md" alt="Poster image" src={item.images.poster_paths.sm} width={99} height={140} />
            <div>
              <ItemLink item={item}>
                <h2 className="text-slate-900 text-base font-semibold">{item.title}</h2>
              </ItemLink>
              <p className="text-slate-200 text-xs my-2">{item.release_date} - {item.genres.join(',')}</p>
              <p>{item.overview}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

interface ItemLinkProps {
  item: TheMovieDbTrendingType
  children: React.ReactElement
}

function ItemLink({ item, children }: ItemLinkProps) {
  return (
    <Link href={item.is_movie ? `/movies/${item.id}` : `/tvhsows/${item.id}`}>
      {children}
    </Link>
  )
}

export default SearchPage
