import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import API from 'src/services/api'
import { TheMovieDbTrendingType } from 'src/services/themoviedb'
import { Badge } from 'src/ui/badge'

interface PageProps {
  params: {
    query: string
  }
}

function parseQueryToString(query: string) {
  return new URLSearchParams(`?query=${query}`).get('query')
}

async function SearchPage({ params }: PageProps) {
  const api = API()
  const searchResults = await api.searchAll(params.query)
  const { moviesCount, seriesCount } = searchResults.reduce((acc: { moviesCount: number, seriesCount: number }, item) => {
    if (item.is_movie) {
      return {
        ...acc,
        moviesCount: acc.moviesCount + 1,
      }
    }
    return {
      ...acc,
      seriesCount: acc.seriesCount + 1,
    }
  }, { moviesCount: 0, seriesCount: 0 } as any)

  return (
    <div className="px-12 py-4 inline-flex gap-6">
      <div className="hidden md:block max-w-xs h-44 rounded-lg bg-slate-500">
        <div className="bg-slate-900 text-white rounded-t-lg py-3 px-6 text-start">
          <h1 className="font-semibold text-base">Resultados da busca:</h1>
          <p className="text-sm">"{parseQueryToString(params.query)}"</p>
        </div>
        <div className="w-full">
          <ul className="w-full pt-6 px-8">
            <li className="flex justify-between mb-2">
              <p>Filmes</p>
              <Badge>{moviesCount}</Badge>
            </li>
            <li className="flex justify-between">
              <p>Séries</p>
              <Badge>{seriesCount}</Badge>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-1 h-full">
        {searchResults.map(item => (
          <div className="bg-slate-500 w-full rounded-lg p-4 flex gap-2 mb-4">
            <Image className="rounded-md" alt="Poster image" src={item.images.poster_paths.md} width={99} height={140} />
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

    </div>
  )
}

interface ItemLinkProps {
  item: TheMovieDbTrendingType
  children: React.ReactElement
}

function ItemLink({ item, children }: ItemLinkProps) {
  return (
    <Link href={item.is_movie ? `/movie/${item.id}` : `/tvhsow/${item.id}`}>
      {children}
    </Link>
  )
}

export default SearchPage