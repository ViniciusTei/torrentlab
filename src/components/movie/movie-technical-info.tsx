import { TheMovieDbDetailsType } from '@/services/types/themoviedb'

interface Props {
  movie: TheMovieDbDetailsType
}

export default function MovieTechnicalInfo({ movie }: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Informações Técnicas</h2>
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">IMDB ID</dt>
          <dd className="text-sm">
            {movie.imdb_id ? (
              <a
                href={`https://imdb.com/title/${movie.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {movie.imdb_id}
              </a>
            ) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Produção</dt>
          <dd className="text-sm">{movie.production_companies?.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">País</dt>
          <dd className="text-sm">{movie.production_countries?.join(', ') || '—'}</dd>
        </div>
      </dl>
    </section>
  )
}
