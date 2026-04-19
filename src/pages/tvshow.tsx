import { useState } from "react";
import { useLoaderData } from "react-router-dom";

import getAPI from "@/services/api";
import { TheMovieDbShowDetailResponse } from "@/services/types/themoviedb";
import TvShowHero from "@/components/tvshow/tvshow-hero";
import SeasonSidebar from "@/components/tvshow/season-sidebar";
import EpisodeList from "@/components/tvshow/episode-list";
import MovieCast from "@/components/movie/movie-cast";
import SubtitlesGrid from "@/components/movie/subtitles-grid";

function TvShowPage() {
  const show = useLoaderData() as TheMovieDbShowDetailResponse;

  const regularSeasons = show.seasons?.filter((s) => s.season_number > 0) ?? [];
  const defaultSeason = regularSeasons[0]?.season_number ?? 1;
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);

  const currentSeason = show.seasons?.find((s) => s.season_number === selectedSeason);

  return (
    <div className="-mx-16">
      <TvShowHero show={show} />

      <div className="grid grid-cols-[220px_1fr] gap-8 px-16 py-8 max-w-screen-lg mx-auto">
        {/* Sidebar */}
        <aside className="flex flex-col gap-8">
          {show.seasons && show.seasons.length > 0 && (
            <SeasonSidebar
              seasons={show.seasons}
              selectedSeason={selectedSeason}
              onSelect={setSelectedSeason}
            />
          )}
          <MovieCast cast={show.cast} />
        </aside>

        {/* Main content */}
        <main className="flex flex-col gap-10">
          {currentSeason && (
            <EpisodeList
              showId={show.id}
              showTitle={show.title}
              theMovieDbId={show.id}
              seasonNumber={selectedSeason}
              seasonName={currentSeason.name}
            />
          )}
          <SubtitlesGrid subtitles={show.subtitles} />
        </main>
      </div>
    </div>
  );
}

export async function loader({ params }: any) {
  const api = getAPI();
  return api.fetchTvShowsDetails(Number(params.id));
}

export default TvShowPage;
