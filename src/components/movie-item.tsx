import { Link } from "react-router-dom";
import { TheMovieDbTrendingType } from "@/services/types/themoviedb";
import { useDownloadStatus } from "@/hooks/useDownloadStatus";
import { getFullYear } from "@/lib/datetime";

interface Props {
  item: TheMovieDbTrendingType;
}

function MovieItem({ item }: Props) {
  const downloadStatus = useDownloadStatus(item.id);
  const href = item.is_movie ? `/movie/${item.id}` : `/tvshow/${item.id}`;
  const year = getFullYear(item.release_date);
  const genreLabel = item.genres?.slice(0, 2).join(" • ");
  const meta = [genreLabel, year].filter(Boolean).join(" • ");

  return (
    <article className="group cursor-pointer">
      <Link to={href}>
        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative mb-3">
          <img
            alt={item.title}
            src={item.images.poster_paths.md}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
            <button
              type="button"
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
            >
              Ver detalhes
            </button>
          </div>

          {downloadStatus && (
            <div className="absolute top-3 left-3">
              <span
                className={`backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase ${
                  downloadStatus === "downloaded"
                    ? "bg-green-600/80"
                    : "bg-yellow-500/80"
                }`}
              >
                {downloadStatus === "downloaded" ? "✓ Baixado" : "⬇ Baixando"}
              </span>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-bold text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2 text-sm">
            {item.title}
          </h4>
          {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
        </div>
      </Link>
    </article>
  );
}

export default MovieItem;
