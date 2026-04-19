import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import getAPI, { WatchlistItem } from '@/services/api'

export function useWatchlist(the_movie_db_id: number, media_type: 'movie' | 'tv') {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: watchlist = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getAPI().fetchWatchlist(),
    staleTime: 5 * 60 * 1000,
  })

  const inWatchlist = watchlist.some(item => item.the_movie_db_id === the_movie_db_id)

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: () => {
      const current = queryClient.getQueryData<WatchlistItem[]>(['watchlist']) ?? []
      const alreadyIn = current.some(item => item.the_movie_db_id === the_movie_db_id)
      return alreadyIn
        ? getAPI().removeFromWatchlist(the_movie_db_id)
        : getAPI().addToWatchlist(the_movie_db_id, media_type)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
    onError: () =>
      toast({ title: 'Não foi possível atualizar sua lista.', variant: 'destructive' }),
  })

  return { inWatchlist, toggle, isPending }
}
