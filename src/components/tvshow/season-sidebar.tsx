import { LuTv, LuStar } from "react-icons/lu";
import { cn } from "@/lib/utils";

type Season = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  vote_average: number;
};

interface Props {
  seasons: Season[];
  selectedSeason: number;
  onSelect: (season_number: number) => void;
}

export default function SeasonSidebar({ seasons, selectedSeason, onSelect }: Props) {
  const regularSeasons = seasons.filter((s) => s.season_number > 0);
  const specials = seasons.filter((s) => s.season_number === 0);

  return (
    <aside className="flex flex-col gap-2">
      <div className="mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">
          Navegador da Série
        </p>
        <p className="text-xs text-muted-foreground">Selecione uma temporada</p>
      </div>

      <div className="flex flex-col gap-1">
        {regularSeasons.map((season) => (
          <button
            key={season.id}
            onClick={() => onSelect(season.season_number)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
              selectedSeason === season.season_number
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            )}
          >
            <LuTv
              size="1rem"
              className={cn(
                "flex-shrink-0",
                selectedSeason === season.season_number
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              )}
            />
            <span className="text-sm font-medium">{season.name}</span>
          </button>
        ))}

        {specials.map((season) => (
          <button
            key={season.id}
            onClick={() => onSelect(season.season_number)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
              selectedSeason === season.season_number
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            )}
          >
            <LuStar
              size="1rem"
              className={cn(
                "flex-shrink-0",
                selectedSeason === season.season_number
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              )}
            />
            <span className="text-sm font-medium">{season.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
