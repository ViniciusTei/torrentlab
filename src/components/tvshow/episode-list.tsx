import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import getAPI from "@/services/api";
import EpisodeRow from "./episode-row";

interface Props {
  showId: number;
  showTitle: string;
  theMovieDbId: number;
  seasonNumber: number;
  seasonName: string;
}

export default function EpisodeList({ showId, showTitle, theMovieDbId, seasonNumber, seasonName }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tvshow-season", showId, seasonNumber],
    queryFn: () => getAPI().fetchTvShowSeasonEpisodes(showId, seasonNumber),
  });

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-2xl font-bold">{seasonName} Episódios</h2>
        {data && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.episodes.length} episódio{data.episodes.length !== 1 ? "s" : ""} disponíveis
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>Não foi possível carregar os episódios.</AlertDescription>
        </Alert>
      )}

      {data && data.episodes.length === 0 && (
        <Alert>
          <AlertTitle>Sem episódios</AlertTitle>
          <AlertDescription>Nenhum episódio encontrado para esta temporada.</AlertDescription>
        </Alert>
      )}

      {data && data.episodes.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.episodes.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              showId={showId}
              showTitle={showTitle}
              theMovieDbId={theMovieDbId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
