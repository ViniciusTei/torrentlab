import { useState } from "react";
import { Link } from "react-router-dom";
import { FaDownload } from "react-icons/fa";
import { LuClock } from "react-icons/lu";

import { TvShowEpisode } from "@/services/types/themoviedb";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSocketContext } from "@/context/sockets";
import { useToast } from "@/components/ui/use-toast";
import getAPI from "@/services/api";

interface Props {
  episode: TvShowEpisode;
  showId: number;
  showTitle: string;
  theMovieDbId: number;
}

function zeroPad(n: number, digits = 2) {
  return String(n).padStart(digits, "0");
}

export default function EpisodeRow({ episode, showId, showTitle, theMovieDbId }: Props) {
  const { activeDownloads, startDownload } = useSocketContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const episodeCode = `S${zeroPad(episode.season_number)}E${zeroPad(episode.episode_number)}`;
  const active = activeDownloads.find((i) => i.itemId === String(episode.id));

  async function handleDownloadBest() {
    setLoading(true);
    try {
      const api = getAPI();
      const query = `${showTitle} ${episodeCode}`;
      const results = await api.searchTorrents(query, "series");
      if (!results || results.length === 0) {
        toast({ title: "Sem torrents", description: `Nenhum torrent encontrado para ${episodeCode}`, variant: "destructive" });
        return;
      }
      const best = results.reduce((top, cur) =>
        (Number(cur.seeders) ?? 0) > (Number(top.seeders) ?? 0) ? cur : top
      );
      startDownload({
        magnet: best.magneturl ?? (Array.isArray(best.link) ? best.link[0] : best.link),
        itemId: String(episode.id),
        theMovieDbId,
        title: `${showTitle} ${episodeCode}`,
        size: best.size,
      });
    } catch {
      toast({ title: "Erro", description: "Falha ao buscar torrents", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 rounded-xl bg-card p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-44 h-28">
        {episode.still_url ? (
          <img
            src={episode.still_url}
            alt={episode.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
            Sem imagem
          </div>
        )}
        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">
          EP {zeroPad(episode.episode_number)}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-1 items-center gap-4 py-3 pr-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{episode.name}</p>
            {episode.runtime && (
              <span className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                <LuClock size="0.75rem" />
                {episode.runtime} min
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {episode.overview || "Sem descrição disponível."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0 w-36">
          {active ? (
            <div className="flex items-center gap-2">
              <Progress value={(active.progress ?? 0) * 100} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {Math.round((active.progress ?? 0) * 100)}%
              </span>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleDownloadBest}
              disabled={loading}
              className="w-full"
            >
              <FaDownload className="mr-1.5" />
              {loading ? "Buscando…" : "Baixar Melhor"}
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link
              to={`/tvshow/${showId}/season/${episode.season_number}/episode/${episode.episode_number}`}
            >
              Ver Detalhes
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
