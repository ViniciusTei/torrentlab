import { FaDownload } from 'react-icons/fa'
import Link from 'next/link'

import Torrents from 'src/services/torrents'
import { TheMovieDbTrendingType } from 'src/services/types/themoviedb'

interface Props {
  item: TheMovieDbTrendingType
}

function MovieItem({ item }: Props) {

  async function handleDownload(name: string) {
    try {
      const data = await Torrents({ type: item.is_movie ? "movie" : "series", search: name })
      const links = data[0] && data[0].link
      const download = Array.isArray(links) ? links[0] : links
      window && window.open(download, '_blank')?.focus();
    } catch (e) {
      alert('Não foi possível começar o seu download')
    }
  }

  if (!item) return null

  return (
    <Link key={item.id} href={item?.is_movie ? `/movie/${item?.id}` : `/tvshow/${item.id}`} className="cursor-pointer min-w-[226px] h-[385px] flex-1 bg-gray-700 text-white pt-2 px-0 rounded-sm relative">
      <img alt={item.title} src={item.images.poster_paths.md} className="object-contain m-0 p-0 mx-auto" />
      <p className="ml-2 font-semibold whitespace-normal">{item.title}</p>
      <p className="ml-2 font-light text-xs whitespace-normal">{item.genres?.join(", ")}</p>
      <button type="button" className="absolute bottom-2 right-2" onClick={() => handleDownload(item.title)}>
        <FaDownload color="#1884F7" />
      </button>
    </Link>
  )
}

export default MovieItem
