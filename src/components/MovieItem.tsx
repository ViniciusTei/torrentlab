'use client'

import axios from 'axios'
import download from 'js-file-download'

import createMagnetLink from '../utils/magnet'
import { MovieData, MovieDataTorrent } from '../services/movies'

interface Props {
  movie: MovieData
}

function MovieItem({ movie }: Props) {

  async function handleDownload(torrent: MovieDataTorrent) {
    const magnet = createMagnetLink(torrent.hash, movie.title)
    const response = await axios.post('http://localhost:3000/api/download', { magnet })
    download(response.data, `${movie.title}.torrent`)
  }

  return (
    <div key={movie.id} className="cursor-pointer w-52 h-72">
      <img alt={movie.title} src={movie.large_cover_image} width="135" height="200" />
      <p>{movie.title}</p>
    </div>
  )
}

export default MovieItem
