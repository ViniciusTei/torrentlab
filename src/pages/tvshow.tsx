import React from 'react'
import dayjs from 'dayjs'

import getAPI from '@/services/api'
import { useLoaderData } from 'react-router-dom'
import { useCounter } from '@/utils/counter'
import { Progress } from '@/components/ui/progress'
import SubtitleItem from '@/components/subtitle-item'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TheMovieDbShowDetailResponse } from '@/services/types/themoviedb'
import { LuCalendar, LuFilm, LuThumbsUp } from 'react-icons/lu'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type Params = {
  item: TheMovieDbShowDetailResponse
}

function TvShowPage() {
  const data = useLoaderData() as Params

  if (!data) {
    const value = useCounter()
    return (
      <>
        <Progress value={value} />
      </>
    )
  }

  const { item } = data
  return (
    <div className="text-white">
      <div className="flex gap-1 items-end relative min-w-[800px] w-fit mx-auto">
        <img src={item.images.poster_paths.lg} alt="Poster detail image" className="w-52 h-72" />
        <div>
          <p className="font-semibold text-3xl">{item.title}</p>
          <div className="my-1 text-lg font-semibold">
            {item.genres?.join(", ")} • {item.release_date}
          </div>
        </div>
      </div>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Descrição</h2>
        <p>{item.overview}</p>
      </section>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Temporadas</h2>
        <ul>
          {item.seasons && item.seasons.map(d => (
            <li key={d.id} className="my-2">
              <Card>
                <CardHeader>
                  <CardTitle>{d.name}</CardTitle>
                  <CardDescription><LuThumbsUp /> {d.vote_average}</CardDescription>
                </CardHeader>
                <CardContent>
                  {d.overview}
                </CardContent>
                <CardFooter className="gap-2">
                  <p className="inline-flex items-center gap-1 justify-center">
                    <LuFilm size="1rem" />{d.episode_count} episodios
                  </p>
                  <p className="inline-flex items-center gap-1 justify-center">
                    <LuCalendar size="1rem" /> {dayjs(d.air_date).format('DD/MM/YYYY')}
                  </p>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </section>
      <section className="px-40">
        <h2 className="text-xl font-bold my-4">Legendas</h2>
        <ul>
          {item.subtitles && item.subtitles.map(item => (
            <SubtitleItem key={item.id} subtitle={item} />
          ))}
        </ul>
        {!item.subtitles || item.subtitles.length === 0 && (
          <Alert variant="destructive">
            <AlertTitle>Sem legendas</AlertTitle>
            <AlertDescription>Ainda não foram encontrados legendas disponíveis para essa mídia.</AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  )
}

export async function loader({ params }: any) {
  const api = getAPI()
  const item = await api.fetchTvShowsDetails(Number(params.id))

  return {
    item,
  }
}

export default TvShowPage
