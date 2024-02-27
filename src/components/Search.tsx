import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import API from 'src/services/api'
import { TheMovieDbTrendingType } from 'src/services/themoviedb'
import { Popover, PopoverContent, PopoverTrigger } from 'src/ui/popover'
import SearchInput from 'src/ui/searchinput'

function Search() {
  const [res, setRes] = useState([] as TheMovieDbTrendingType[])
  const api = API()
  const router = useRouter()

  async function handleSearch(search: string) {
    if (search) {
      const r = await api.searchAll(search)
      setRes(r)
    }
  }

  function handleClick(item: TheMovieDbTrendingType) {
    if (item.is_movie) {
      router.push(`/movie/${item.id}`)
    } else {
      router.push(`/tvshow/${item.id}`)
    }

    setRes([])
  }

  return (
    <div>
      <Popover open={res.length > 0}>
        <PopoverTrigger>
          <SearchInput onSearch={handleSearch} />
        </PopoverTrigger>
        <PopoverContent>
          {res.map(item => (
            <div key={item.id} onClick={() => handleClick(item)} className="cursor-pointer">
              <Image alt="Cover" src={item.images.poster_paths.md} width={100} height={200} />
              {item.title}
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default Search
