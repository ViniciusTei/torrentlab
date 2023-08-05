import { MovieType } from '../services/movies'
import { FaDownload } from 'react-icons/fa'
import { torrentFactory } from '../services/torrents'
import Link from 'next/link'

interface Props {
  movie: MovieType
}

function MovieItem({ movie }: Props) {

  async function handleDownload(name: string) {
    try {
      const data = await torrentFactory({ search: name })
      window && window.open(data[0] && data[0].link, '_blank').focus();
    } catch (e) {
      alert('Nao foi possivel comecar o seu download')
    }
  }

  return (
    <Link key={movie.id} href={`/movie/${movie.id}`} className="cursor-pointer min-w-[226px] h-[385px] flex-1 bg-gray-700 text-white pt-2 px-0 rounded-sm relative">
      <img alt={movie.title} src={movie.images.poster_paths.md} className="object-contain m-0 p-0 mx-auto" />
      <p className="ml-2 font-semibold">{movie.title}</p>
      <p className="ml-2 font-light text-xs">{movie.genres.join("/")}</p>
      <button type="button" className="absolute bottom-2 right-2" onClick={() => handleDownload(movie.original_title)}>
        <FaDownload color="#1884F7" />
      </button>
    </Link>
  )
}

export default MovieItem
