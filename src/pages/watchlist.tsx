import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import MovieItem from '@/components/movie-item'
import { TheMovieDbDetailsType } from '@/services/types/themoviedb'
import getAPI from '@/services/api'
import { useToast } from '@/components/ui/use-toast'

export default function WatchlistPage() {
  const { data: saved = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getAPI().fetchWatchlist(),
  })

  const { data: items, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['watchlist-details', saved.map(s => s.the_movie_db_id).join(',')],
    queryFn: () =>
      Promise.all(
        saved.map(s =>
          s.media_type === 'movie'
            ? getAPI().fetchMovieDetails(s.the_movie_db_id)
            : getAPI().fetchTvShowsDetails(s.the_movie_db_id)
        )
      ),
    enabled: saved.length > 0,
  })

  const isLoading = isLoadingList || (saved.length > 0 && isLoadingDetails)

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Minha Lista</h1>
      <Content
        isLoading={isLoading}
        items={items}
        savedCount={saved.length}
      />
    </div>
  )
}

interface ContentProps {
  isLoading: boolean
  items: TheMovieDbDetailsType[] | undefined
  savedCount: number
}

function Content({ isLoading, items, savedCount }: ContentProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[226px] h-[385px] rounded" />
        ))}
      </div>
    )
  }

  if (savedCount === 0 || !items || items.length === 0) {
    return (
      <Alert>
        <AlertTitle>Sua lista está vazia.</AlertTitle>
        <AlertDescription>
          Adicione filmes e séries usando o botão "Adicionar à Lista" na página de detalhes.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-wrap gap-4">
      {items.map(item => (
        <WatchlistCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function WatchlistCard({ item }: { item: TheMovieDbDetailsType }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { mutate: remove, isPending } = useMutation({
    mutationFn: () => getAPI().removeFromWatchlist(item.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
    onError: () => toast({ title: 'Não foi possível remover o item.', variant: 'destructive' }),
  })

  return (
    <div className="relative">
      <MovieItem item={item} />
      <button
        type="button"
        disabled={isPending}
        onClick={() => remove()}
        className="absolute top-2 left-0 right-0 mx-auto w-fit inline-flex items-center gap-1 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-700 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Removendo…' : '✕ Remover'}
      </button>
    </div>
  )
}
