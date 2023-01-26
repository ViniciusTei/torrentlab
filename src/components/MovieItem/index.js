import React, { useReducer } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { FaTimes, FaStar, FaDownload } from 'react-icons/fa'
import download from 'js-file-download'

import createMagnetLink from '@/utils/magnet'
import styles from './styles.module.css'

function MovieItem({ movie }) {
  const [isModalOpen, toggleIsModalOpen] = useReducer(prev => !prev, false)

  async function handleDownload(torrent) {
    const magnet = createMagnetLink(torrent.hash, movie.title)
    const response = await axios.post('http://localhost:3000/api/download', { magnet })
    download(response.data, `${movie.tile}.torrent`)
  }

  return (
    <>
      <div key={movie.id} className={styles.movie_item} onClick={toggleIsModalOpen}>
        <Image alt={movie.title} src={movie.large_cover_image} width="135" height="200" />
      </div>
      {isModalOpen && (
        <div className={styles.movie_modal}>
          <div className={styles.movie_modal_header}>
            <FaTimes onClick={toggleIsModalOpen}/>
          </div>
          
          <div className={styles.movie_modal_content}>
            <div>
              <Image alt={movie.title} src={movie.large_cover_image} width="262" height="400" />
            </div>
            <div className={styles.movie_modal_content_details}>
              <h1>{movie.title}</h1>
              <p>{movie.year}</p>
              <p>{movie.genres.join(', ')}</p>
              <p>{movie.rating} <FaStar /> </p>
              <p>{movie.synopsis}</p>
            </div>

          </div>

          <div className={styles.movie_modal_content_download}>
            {movie.torrents.map(torrent => (
              <button title={torrent.type} type="button" onClick={() => handleDownload(torrent)}><FaDownload/> {torrent.quality}, <p>{torrent.size}</p></button>
            ))}
          </div>

        </div>
      )}
    </>
  )
}

export default MovieItem
