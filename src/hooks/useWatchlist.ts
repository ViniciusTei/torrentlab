import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import getAPI from '@/services/api'

export function useWatchlist(the_movie_db_id: number, media_type: 'movie' | 'tv') {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: watchlist = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getAPI().fetchWatchlist(),
  })

  const inWatchlist = watchlist.some(item => item.the_movie_db_id === the_movie_db_id)

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: () =>
      inWatchlist
        ? getAPI().removeFromWatchlist(the_movie_db_id)
        : getAPI().addToWatchlist(the_movie_db_id, media_type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
    onError: () =>
      toast({ title: 'Não foi possível atualizar sua lista.', variant: 'destructive' }),
  })

  return { inWatchlist, toggle, isPending }
}
