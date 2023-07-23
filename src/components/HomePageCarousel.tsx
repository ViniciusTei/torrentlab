import React from 'react'
import { MdArrowForwardIos, MdArrowBackIos } from 'react-icons/md'
import { BsPlayCircleFill } from 'react-icons/bs'
import { FaDownload } from 'react-icons/fa'
import { fetchMovieData } from '../services/movies'
import HomePageCarouselDisplay from './HomePageCarouselDisplay'

async function HomePageCarousel() {
  const data = await fetchMovieData(5, 1, undefined)
  
  if (!data) {
    return <div>Carregando...</div>
  }

  return (
    <HomePageCarouselDisplay data={data} />
  )
}

export default HomePageCarousel
