import { useLoaderData, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import getAPI from "@/services/api";
import { TheMovieDbDetailsType, TvShowEpisode } from "@/services/types/themoviedb";
import { useSocketContext } from "@/context/sockets";
import SubtitlesGrid from "@/components/movie/subtitles-grid";
import TorrentsTable from "@/components/movie/torrents-table";
import { Button } from "@/components/ui/button";
import { LuClock, LuStar } from "react-icons/lu";

type EpisodeLoaderData = {
  show: TheMovieDbDetailsType;
  episode: TvShowEpisode;
};

function zeroPad(n: number, digits = 2) {
  return String(n).padStart(digits, "0");
}

function EpisodePage() {
  const { show, episode } = useLoaderData() as EpisodeLoaderData;

  const episodeCode = `S${zeroPad(episode.season_number)}E${zeroPad(episode.episode_number)}`;
  const searchQuery = `${show.title} ${episodeCode}`;

  const { data: downloadIds } = useQuery({
    queryKey: ["download-ids"],
    queryFn: () => getAPI().fetchDownloadIds(),
  });
  const { activeDownloads } = useSocketContext();
  const activeItem = activeDownloads.find((d) => d.itemId === String(episode.id));
  const downloadRow = downloadIds?.find(
    (d) => d.the_movie_db_id === episode.id && d.downloaded !== 0,
  );
  const watchInfoHash = downloadRow?.info_hash ?? activeItem?.infoHash ?? null;

  return (
    <div className="-mx-16">
      {/* Hero */}
      <div className="relative w-full min-h-[360px]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={episode.still_url ?? show.images.backdrop_paths.lg}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/25" />
        </div>

        <div className="relative flex gap-8 px-16 py-10 items-end min-h-[360px] max-w-screen-lg mx-auto">
          {episode.still_url && (
            <img
              src={episode.still_url}
              alt={episode.name}
              className="w-52 h-32 object-cover rounded shadow-lg flex-shrink-0"
            />
          )}
          <div className="flex flex-col justify-end text-white max-w-2xl pb-2">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {episodeCode}
              </span>
              {episode.vote_average > 0 && (
                <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <LuStar size="0.75rem" />
                  {episode.vote_average.toFixed(1)}
                </span>
              )}
              {episode.runtime && (
                <span className="flex items-center gap-1 text-white/70 text-sm">
                  <LuClock size="0.75rem" />
                  {episode.runtime} min
                </span>
              )}
            </div>

            <p className="text-sm text-white/60 mb-1">{show.title}</p>
            <h1 className="text-3xl font-bold mb-3 tracking-tight">{episode.name}</h1>
            <p className="text-white/80 text-sm leading-relaxed line-clamp-3 mb-5">{episode.overview}</p>

            <div className="flex items-center gap-3 flex-wrap">
              <Button asChild>
                <a href="#torrents">Baixar Torrent</a>
              </Button>
              {watchInfoHash && (
                <Button asChild variant="secondary">
                  <Link
                    to={`/player/${watchInfoHash}?title=${encodeURIComponent(`${show.title} ${episodeCode}`)}`}
                  >
                    ▶ Assistir
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div id="torrents" className="px-16 py-8 max-w-screen-lg mx-auto">
        <TorrentsTable imdb_id={undefined} movieId={episode.id} searchQuery={searchQuery} />
        <SubtitlesGrid subtitles={show.subtitles} />
      </div>
    </div>
  );
}

export async function loader({ params }: any) {
  const api = getAPI();
  const [show, seasonDetail] = await Promise.all([
    api.fetchTvShowsDetails(Number(params.showId)),
    api.fetchTvShowSeasonEpisodes(Number(params.showId), Number(params.season)),
  ]);

  const episode = seasonDetail.episodes.find(
    (ep) => ep.episode_number === Number(params.episode),
  );

  if (!episode) throw new Error("Episódio não encontrado.");

  return { show, episode };
}

export default EpisodePage;
