'use client'

import { useReducer } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { FaTimes, FaStar, FaDownload } from 'react-icons/fa'
import download from 'js-file-download'

import createMagnetLink from '../utils/magnet'

function MovieItem({ movie }) {
  const [isModalOpen, toggleIsModalOpen] = useReducer(prev => !prev, false)

  async function handleDownload(torrent: any) {
    const magnet = createMagnetLink(torrent.hash, movie.title)
    const response = await axios.post('http://localhost:3000/api/download', { magnet })
    download(response.data, `${movie.tile}.torrent`)
  }

  return (
    <>
      <div key={movie.id} className="cursor-pointer" onClick={toggleIsModalOpen}>
        <Image alt={movie.title} src={movie.large_cover_image} width="135" height="200" />
      </div>
      {isModalOpen && (
        <div className="fixed">
          <div className="flex items-end justify-end">
            <FaTimes className="cursor-pointer" onClick={toggleIsModalOpen}/>
          </div>
          
          <div className="flex gap-3">
            <div>
              <Image alt={movie.title} src={movie.large_cover_image} width="262" height="400" />
            </div>
            <div >
              <h1>{movie.title}</h1>
              <p className="mt-2">{movie.year}</p>
              <p className="mt-2">{movie.genres.join(', ')}</p>
              <p className="mt-2">{movie.rating} <FaStar /> </p>
              <p className="mt-2">{movie.synopsis}</p>
            </div>

          </div>

          <div className="flex items-center justify-center gap-8">
            {movie.torrents.map((torrent: any) => (
              <button 
                title={torrent.type} 
                type="button" 
                className="bg-transparent rounded cursor-pointer"
                onClick={() => handleDownload(torrent)}
              >
                <FaDownload/> {torrent.quality}, <p className="text-xs">{torrent.size}</p>
              </button>
            ))}
          </div>

        </div>
      )}
    </>
  )
}

export default MovieItem
