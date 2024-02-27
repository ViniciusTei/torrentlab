import { useRouter } from 'next/navigation'
import SearchInput from 'src/ui/searchinput'

function Search() {
  const router = useRouter()

  async function handleSearch(search: string) {
    if (search) {
      router.push(`/search/${search}`)
    }
  }

  return <SearchInput onSearch={handleSearch} />

}

export default Search
