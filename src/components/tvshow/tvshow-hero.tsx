import { TheMovieDbDetailsType } from "@/services/types/themoviedb";

interface Props {
  show: TheMovieDbDetailsType & { seasons?: { season_number: number }[] };
}

export default function TvShowHero({ show }: Props) {
  const seasonCount = show.seasons?.filter((s) => s.season_number > 0).length ?? 0;

  return (
    <div className="relative w-full min-h-[420px]">
      {/* Backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={show.images.backdrop_paths.lg}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative flex gap-8 px-16 py-10 items-end min-h-[420px] max-w-screen-lg mx-auto">
        <img
          src={show.images.poster_paths.lg}
          alt={`${show.title} poster`}
          className="w-40 h-60 object-cover rounded shadow-lg flex-shrink-0"
        />
        <div className="flex flex-col justify-end text-white max-w-2xl pb-2">
          {/* Chips */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {show.genres?.map((g) => (
              <span
                key={g}
                className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
              >
                {g}
              </span>
            ))}
            {show.vote_average > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
                ★ {show.vote_average.toFixed(1)} IMDB
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold mb-2 tracking-tight">{show.title}</h1>

          {seasonCount > 0 && (
            <p className="text-white/60 text-sm mb-2">
              {seasonCount} temporada{seasonCount !== 1 ? "s" : ""}
            </p>
          )}

          <p className="text-white/80 text-sm leading-relaxed mb-6 line-clamp-3">
            {show.overview}
          </p>

          {/* Lead Cast */}
          {show.cast && show.cast.length > 0 && (
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-3">
                Elenco Principal
              </p>
              <div className="flex gap-4 flex-wrap">
                {show.cast.slice(0, 3).map((member) => (
                  <div
                    key={`${member.name}-${member.character}`}
                    className="flex items-center gap-2"
                  >
                    {member.profile_path ? (
                      <img
                        src={member.profile_path}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {member.name[0]}
                      </div>
                    )}
                    <p className="text-sm font-medium text-white">{member.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
