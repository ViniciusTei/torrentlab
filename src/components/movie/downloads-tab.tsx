import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { FaPeopleArrows } from "react-icons/fa";
import { LuFileDown, LuTimerReset } from "react-icons/lu";

import getAPI from "@/services/api";
import { useSocketContext } from "@/context/sockets";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatBytes, formatDuration } from "@/utils/format";

interface Props {
  movieId: number;
  title: string;
}

export default function DownloadsTab({ movieId, title }: Props) {
  const { data: downloadIds, isLoading } = useQuery({
    queryKey: ["download-ids"],
    queryFn: () => getAPI().fetchDownloadIds(),
  });
  const { activeDownloads } = useSocketContext();

  const completed = (downloadIds ?? []).filter(
    (d) => d.the_movie_db_id === movieId && d.downloaded !== 0,
  );
  const active = activeDownloads.filter((d) => d.theMovieDbId === movieId);
  const hasAny = completed.length > 0 || active.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!hasAny) {
    return (
      <Alert>
        <AlertTitle>Nenhum download encontrado</AlertTitle>
        <AlertDescription>
          Inicie um download na aba de Torrents para ver o conteúdo aqui.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {active.map((item) => (
        <div
          key={item.itemId}
          className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium truncate">{item.title}</p>
            {item.infoHash && (
              <Button asChild size="sm" variant="secondary">
                <Link
                  to={`/player/${item.infoHash}?title=${encodeURIComponent(item.title)}`}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Assistir
                </Link>
              </Button>
            )}
          </div>
          <Progress value={item.progress * 100} className="h-1.5" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FaPeopleArrows /> {item.peers} peers
            </span>
            <span className="inline-flex items-center gap-1">
              <LuFileDown /> {formatBytes(item.downloaded)}/{formatBytes(item.size)}
            </span>
            <span className="inline-flex items-center gap-1">
              <LuTimerReset />
              {item.timeRemaining > 0 ? formatDuration(item.timeRemaining) : "—"}
            </span>
            <span className="ml-auto font-medium text-yellow-500">
              Em andamento • {Math.round(item.progress * 100)}%
            </span>
          </div>
        </div>
      ))}

      {completed.map((row) => {
        const displayTitle = row.title ?? row.info_hash;
        return (
          <div
            key={row.info_hash}
            className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-4"
          >
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{displayTitle}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {row.info_hash.slice(0, 16)}…
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-green-500">✓ Concluído</span>
              <Button asChild size="sm">
                <Link
                  to={`/player/${row.info_hash}?title=${encodeURIComponent(row.title ?? title)}`}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Assistir
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
