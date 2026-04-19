import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, X, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import getAPI from "@/services/api";
import { useSocketContext } from "@/context/sockets";
import { DownloadItem } from "@/context/sockets";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDuration } from "@/utils/format";

interface Props {
  movieId: number;
  title: string;
}

interface CompletedRow {
  info_hash: string;
  title: string | null;
  torrent_name: string | null;
  the_movie_db_id: number;
  downloaded: number;
  size: number | null;
  quality: string | null;
}

function QualityBadge({ quality }: { quality: string | null }) {
  if (!quality) return null;
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
      {quality}
    </Badge>
  );
}

function ActiveDownloadRow({ item }: { item: DownloadItem }) {
  const { cancelDownload } = useSocketContext();
  const [cancelling, setCancelling] = useState(false);

  function handleCancel() {
    setCancelling(true);
    cancelDownload(item.itemId);
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 text-sm font-medium truncate max-w-[260px]">
        {item.title}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {formatBytes(item.downloaded)}/{formatBytes(item.size)}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {item.peers} peers
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {item.timeRemaining > 0 ? formatDuration(item.timeRemaining) : "—"}
      </td>
      <td className="py-3 pr-4 min-w-[160px]">
        <div className="flex items-center gap-2">
          <Progress value={item.progress * 100} className="h-1.5 flex-1" />
          <span className="text-xs text-yellow-500 font-medium whitespace-nowrap">
            {Math.round(item.progress * 100)}%
          </span>
        </div>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          {item.infoHash ? (
            <Button asChild size="sm" variant="secondary">
              <Link
                to={`/player/${item.infoHash}?title=${encodeURIComponent(item.title)}&itemId=${item.theMovieDbId}`}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Assistir
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CompletedDownloadRow({
  row,
  title,
  theMovieDbId,
}: {
  row: CompletedRow;
  title: string;
  theMovieDbId: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await getAPI().deleteDownload(row.info_hash);
      queryClient.invalidateQueries({ queryKey: ["download-ids"] });
    } catch (err) {
      console.error("Failed to delete download:", err);
      toast({ title: "Erro ao deletar", description: "Não foi possível remover o download.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  const displayName = row.title ?? row.torrent_name ?? row.info_hash;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 text-sm font-medium max-w-[260px]">
        <div className="flex flex-col gap-1">
          <span className="truncate">{displayName}</span>
          <QualityBadge quality={row.quality} />
        </div>
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {row.size ? formatBytes(row.size) : "—"}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">—</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">—</td>
      <td className="py-3 pr-4">
        <span className="text-xs font-semibold text-green-500">✓ Concluído</span>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link
              to={`/player/${row.info_hash}?title=${encodeURIComponent(row.title ?? title)}&itemId=${theMovieDbId}`}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Assistir
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
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

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Meus Downloads</h2>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      )}

      {!isLoading && !hasAny && (
        <Alert>
          <AlertTitle>Nenhum download encontrado</AlertTitle>
          <AlertDescription>
            Inicie um download na aba de Torrents para ver o conteúdo aqui.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && hasAny && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Nome
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Tamanho
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Peers
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Tempo Rest.
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="pb-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {active.map((item) => (
                <ActiveDownloadRow key={item.itemId} item={item} />
              ))}
              {completed.map((row) => (
                <CompletedDownloadRow
                  key={row.info_hash}
                  row={row}
                  title={title}
                  theMovieDbId={movieId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
