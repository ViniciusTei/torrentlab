import { useLoaderData, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import getAPI from '@/services/api'
import { TheMovieDbTrendingType } from '@/services/types/themoviedb'
import MovieItem from '@/components/movie-item'
import { Button } from '@/components/ui/button'

const SECTION_LABELS: Record<string, string> = {
  all: 'Todos em destaque',
  movie: 'Filmes em destaque',
  tv: 'Séries em destaque',
}

interface LoaderData {
  results: TheMovieDbTrendingType[]
  total_pages: number
  total_results: number
  page: number
  type: string
}

import { LoaderFunctionArgs } from 'react-router-dom'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') ?? '1') || 1
  const type = params.type as 'all' | 'movie' | 'tv'

  if (!['all', 'movie', 'tv'].includes(type)) {
    throw new Error('Tipo inválido. Use: all, movie ou tv.')
  }

  const data = await getAPI().fetchTrendingPaginated(type, page)
  return { ...data, type }
}

export default function BrowsePage() {
  const { results, total_pages, total_results, page, type } = useLoaderData() as LoaderData
  const { type: typeParam } = useParams<{ type: string }>()
  const navigate = useNavigate()

  const title = SECTION_LABELS[type] ?? 'Navegando'

  function goToPage(newPage: number) {
    navigate(`/browse/${typeParam}?page=${newPage}`)
  }

  return (
    <div className="py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{total_results} resultados</p>
        </div>
        <span className="text-sm text-muted-foreground">
          Página {page} de {total_pages}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {results.map(item => (
          <MovieItem key={item.id} item={item} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 mt-10">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        <div className="flex items-center gap-1">
          {buildPageRange(page, total_pages).map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="sm"
                className="w-9"
                onClick={() => goToPage(p as number)}
              >
                {p}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= total_pages}
          onClick={() => goToPage(page + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  const delta = 2
  const range: (number | '...')[] = []
  let prev = 0

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      if (prev && i - prev > 1) range.push('...')
      range.push(i)
      prev = i
    }
  }

  return range
}
