import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TheMovieDbDetailsType } from "@/services/types/themoviedb";

interface Props {
  movie: TheMovieDbDetailsType;
  watchInfoHash: string | null;
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MovieHero({ movie, watchInfoHash }: Props) {
  return (
    <div className="relative w-full min-h-[420px]">
      {/* Backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={movie.images.backdrop_paths.lg}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative flex gap-8 px-16 py-10 items-end min-h-[420px] max-w-screen-lg mx-auto">
        <img
          src={movie.images.poster_paths.lg}
          alt={`${movie.title} poster`}
          className="w-40 h-60 object-cover rounded shadow-lg flex-shrink-0"
        />
        <div className="flex flex-col justify-end text-white max-w-2xl pb-2">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2">
            {movie.vote_average > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded">
                ★ {movie.vote_average.toFixed(1)}
              </span>
            )}
            {movie.content_rating && (
              <span className="border border-white/50 text-white text-xs px-2 py-0.5 rounded">
                {movie.content_rating}
              </span>
            )}
            {movie.runtime != null && movie.runtime > 0 && (
              <span className="text-white/70 text-sm">
                {formatRuntime(movie.runtime)}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-1">{movie.title}</h1>
          <p className="text-white/70 text-sm mb-3">
            {movie.genres?.join(", ")} • {movie.release_date}
          </p>
          <p className="text-white/80 text-sm leading-relaxed mb-6 line-clamp-3">
            {movie.overview}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Button asChild>
              <a href="#torrents">Baixar Torrent</a>
            </Button>
            <Button
              variant="outline"
              disabled
              className="border-white/40 bg-transparent text-white hover:bg-white/10 disabled:opacity-60"
            >
              Adicionar à Lista
            </Button>
            {watchInfoHash && (
              <Button asChild variant="secondary">
                <Link
                  to={`/player/${watchInfoHash}?title=${encodeURIComponent(movie.title ?? "")}`}
                >
                  ▶ Assistir
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
