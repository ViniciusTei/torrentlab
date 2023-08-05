import { FaDownload } from 'react-icons/fa'
import { torrentFactory } from '../services/torrents'
import Link from 'next/link'
import { TheMovieDbTrendingType } from '../services/themoviedb'

interface Props {
  item: TheMovieDbTrendingType
}

function Item({ item }: Props) {

  async function handleDownload(name: string) {
    try {
      const data = await torrentFactory({ search: name })
      window && window.open(data[0] && data[0].link, '_blank').focus();
    } catch (e) {
      alert('Nao foi possivel comecar o seu download')
    }
  }

  if (!item) return null

  return (
    <Link key={item.id} href={item?.is_movie ? `/movie/${item?.id}`: `/tvshow/${item.id}`} className="cursor-pointer min-w-[226px] h-[385px] flex-1 bg-gray-700 text-white pt-2 px-0 rounded-sm relative">
      <img alt={item.title} src={item.images.poster_paths.md} className="object-contain m-0 p-0 mx-auto" />
      <p className="ml-2 font-semibold">{item.title}</p>
      <p className="ml-2 font-light text-xs">{item.genres.join("/")}</p>
      <button type="button" className="absolute bottom-2 right-2" onClick={() => handleDownload(item.title)}>
        <FaDownload color="#1884F7" />
      </button>
    </Link>
  )
}

export default Item
