import { FaDownload } from 'react-icons/fa'
import { TheMovieDbTrendingType } from '@/services/types/themoviedb'
import { useDownloadStatus } from '@/hooks/useDownloadStatus'

interface Props {
  item: TheMovieDbTrendingType
}

function MovieItem({ item }: Props) {
  const downloadStatus = useDownloadStatus(item.id)

  if (!item) return null

  return (
    <a
      href={item.is_movie ? `/movie/${item.id}` : `/tvshow/${item.id}`}
      className="cursor-pointer min-w-[226px] h-[385px] flex-1 bg-gray-700 text-white pt-2 px-0 rounded-sm relative"
    >
      <div className="relative">
        <img alt={item.title} src={item.images.poster_paths.md} className="object-contain m-0 p-0 mx-auto" />
        {downloadStatus && (
          <span className={`absolute bottom-0 left-0 right-0 text-center text-xs font-semibold py-1 ${
            downloadStatus === 'downloaded'
              ? 'bg-green-600 text-white'
              : 'bg-yellow-500 text-black'
          }`}>
            {downloadStatus === 'downloaded' ? '✓ Baixado' : '⬇ Baixando'}
          </span>
        )}
      </div>
      <p className="ml-2 font-semibold whitespace-normal">{item.title}</p>
      <p className="ml-2 font-light text-xs whitespace-normal">{item.genres?.join(', ')}</p>
      <button type="button" className="absolute bottom-2 right-2">
        <FaDownload color="#1884F7" />
      </button>
    </a>
  )
}

export default MovieItem

