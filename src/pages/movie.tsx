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
import DownloadsTab from "@/components/movie/downloads-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function Movie() {
  const movie = useLoaderData() as TheMovieDbDetailsType;

  const { data: downloadIds } = useQuery({
    queryKey: ["download-ids"],
    queryFn: () => getAPI().fetchDownloadIds(),
  });
  const { activeDownloads } = useSocketContext();

  const completedForMovie = (downloadIds ?? []).filter(
    (d) => d.the_movie_db_id === movie.id && d.downloaded !== 0,
  );
  const activeForMovie = activeDownloads.filter(
    (d) => d.theMovieDbId === movie.id,
  );
  const downloadCount = completedForMovie.length + activeForMovie.length;

  const firstCompleted = completedForMovie[0];
  const firstActive = activeForMovie[0];
  const watchInfoHash =
    firstCompleted?.info_hash ?? firstActive?.infoHash ?? null;

  return (
    <div className="-mx-16">
      <MovieHero movie={movie} watchInfoHash={watchInfoHash} />

      <div className="grid grid-cols-[280px_1fr] gap-8 px-16 py-8 max-w-screen-lg mx-auto">
        <aside>
          <MovieCast cast={movie.cast} />
          <MovieTechnicalInfo movie={movie} />
        </aside>
        <main>
          <Tabs defaultValue="torrents" className="mb-8">
            <TabsList>
              <TabsTrigger value="torrents">Torrents</TabsTrigger>
              <TabsTrigger value="downloads" className="relative">
                Meus Downloads
                {downloadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4">
                    {downloadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="subtitles">Legendas</TabsTrigger>
            </TabsList>

            <TabsContent value="torrents" className="mt-4">
              {movie.imdb_id ? (
                <TorrentsTable imdb_id={movie.imdb_id} movieId={movie.id} />
              ) : (
                <Alert variant="destructive">
                  <AlertTitle>Sem downloads</AlertTitle>
                  <AlertDescription>
                    IMDb ID não encontrado para essa mídia.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="downloads" className="mt-4">
              <DownloadsTab movieId={movie.id} title={movie.title} />
            </TabsContent>

            <TabsContent value="subtitles" className="mt-4">
              <SubtitlesGrid subtitles={movie.subtitles} />
            </TabsContent>
          </Tabs>
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
