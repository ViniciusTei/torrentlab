'use client'

import { useState } from 'react'
import { MdArrowForwardIos, MdArrowBackIos } from 'react-icons/md'
import { BsPlayCircleFill } from 'react-icons/bs'
import { FaDownload } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { TheMovieDbTrendingType } from '../services/types/themoviedb'
import { useRouter } from 'next/navigation'

interface Props {
  data: TheMovieDbTrendingType[]
}

function HomePageCarouselDisplay({ data }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [motionInitialState, setMotionInitialState] = useState({ x: 100 })

  function handleArrowClick(type: 'back' | 'forward') {
    if (type === 'back') {
      setMotionInitialState({ x: -100 })
      setCurrent(current > 0 ? current - 1 : data.length - 1)
    }

    if (type === 'forward') {
      setMotionInitialState({ x: 100 })
      setCurrent(current < data.length - 1 ? current + 1 : 0)
    }

  }

  function handleGotoPageButton(item: TheMovieDbTrendingType) {
    if (item.is_movie) {
      router.push(`/movie/${item.id}`)
      return
    }

    router.push(`/tvshow/${item.id}`)
  }

  return (
    <div className='w-full flex justify-around items-center'>
      <div>
        <button type="button" onClick={() => handleArrowClick('back')} >
          <div className="h-24 w-12 bg-gray-700 rounded-br-full rounded-tr-full flex justify-center items-center hover:brightness-90 active:scale-105">
            <MdArrowBackIos color="red" size={24} />
          </div>
        </button>
      </div>
      {data.map((d, index) => current === index && (
        <motion.div
          key={d.id}
          initial={motionInitialState}
          animate={{ x: 0 }}
          transition={{ ease: "easeIn", duration: 0.2 }}
          className={`flex-1 flex justify-center items-center relative h-[721px]`}
        >
          <img src={d.images.backdrop_paths.lg} alt={d.title} className="w-[1440px] mx-2 h-[712px]" />
          <div className='w-full h-full top-0 left-0 bg-gradient-to-t from-black absolute' />
          <div className='absolute left-48 bottom-36 max-w-lg pl-4'>
            <h2 className='text-3xl font-semibold capitalize mb-3'>{d.title}</h2>
            <div className='my-1 text-xl font-semibold'>
              {d.genres?.join(",")} • {d.release_date} • {d.popularity}
            </div>
            <p className='text-sm text-gray-100 truncate'>{d.overview}</p>
            <div className='flex items-center gap-2'>
              <button type="button" onClick={() => handleGotoPageButton(d)} className='px-5 py-1 mt-3 rounded text-white flex items-center bg-white/10 hover:brightness-90 active:scale-95'>
                <BsPlayCircleFill color="red" size={20} /> <p className='ml-1'> Go to page </p>
              </button>
              <button type="button" className='px-5 py-1 mt-3 rounded text-white flex items-center bg-transparent border hover:brightness-90 active:scale-95'>
                <FaDownload /> <p className='ml-1'>Download</p>
              </button>
            </div>
          </div>
        </motion.div>
      )
      )}
      <div>
        <button type="button" onClick={() => handleArrowClick('forward')}>
          <div className="h-24 w-12 bg-gray-700 rounded-bl-full rounded-tl-full flex justify-center items-center hover:brightness-90 active:scale-105">
            <MdArrowForwardIos color="red" size={24} />
          </div>
        </button>
      </div>
    </div>
  )
}

export default HomePageCarouselDisplay

