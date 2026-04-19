import { useLoaderData } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { TheMovieDbDetailsType } from "@/services/types/themoviedb";
import getAPI from "@/services/api";
import { useSocketContext } from "@/context/sockets";
import MovieHero from "@/components/movie/movie-hero";
import MovieCast from "@/components/movie/movie-cast";
import MovieTechnicalInfo from "@/components/movie/movie-technical-info";
import TorrentsTable from "@/components/movie/torrents-table";
import SubtitlesGrid from "@/components/movie/subtitles-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function Movie() {
  const movie = useLoaderData() as TheMovieDbDetailsType;

  const { data: downloadIds } = useQuery({
    queryKey: ["download-ids"],
    queryFn: () => getAPI().fetchDownloadIds(),
  });
  const { activeDownloads } = useSocketContext();
  const downloadRow = downloadIds?.find(
    (d) => d.the_movie_db_id === movie.id && d.downloaded !== 0,
  );
  const activeItem = activeDownloads.find((d) => d.theMovieDbId === movie.id);
  const watchInfoHash = downloadRow?.info_hash ?? activeItem?.infoHash ?? null;

  return (
    <div className="-mx-16">
      <MovieHero movie={movie} watchInfoHash={watchInfoHash} />

      <div className="grid grid-cols-[280px_1fr] gap-8 px-16 py-8 max-w-screen-lg mx-auto">
        <aside>
          <MovieCast cast={movie.cast} />
          <MovieTechnicalInfo movie={movie} />
        </aside>
        <main>
          {movie.imdb_id ? (
            <TorrentsTable imdb_id={movie.imdb_id} movieId={movie.id} />
          ) : (
            <Alert variant="destructive" className="mb-8">
              <AlertTitle>Sem downloads</AlertTitle>
              <AlertDescription>
                IMDb ID não encontrado para essa mídia.
              </AlertDescription>
            </Alert>
          )}
          <SubtitlesGrid subtitles={movie.subtitles} />
        </main>
      </div>
    </div>
  );
}

export async function loader({ params }: { params: { id: string } }) {
  const api = getAPI();
  return api.fetchMovieDetails(Number(params.id));
}

export default Movie;
