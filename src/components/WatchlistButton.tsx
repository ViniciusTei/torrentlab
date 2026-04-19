import { Button } from '@/components/ui/button'
import { useWatchlist } from '@/hooks/useWatchlist'

interface Props {
  the_movie_db_id: number
  media_type: 'movie' | 'tv'
}

export default function WatchlistButton({ the_movie_db_id, media_type }: Props) {
  const { inWatchlist, toggle, isPending } = useWatchlist(the_movie_db_id, media_type)

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => toggle()}
      className={
        inWatchlist
          ? 'border-green-400 text-green-400 hover:bg-green-400/10 disabled:opacity-60'
          : 'border-white/40 bg-transparent text-white hover:bg-white/10 disabled:opacity-60'
      }
    >
      {inWatchlist ? '✓ Na Lista' : 'Adicionar à Lista'}
    </Button>
  )
}
