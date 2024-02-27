import API from 'src/services/api'
import SearchInput from 'src/ui/searchinput'

function Search() {
  const api = API()

  async function handleSearch(search: string) {
    if (search) {
      const res = await api.searchAll(search)
      console.log(res.results)
    }
  }

  return (
    <div>
      <SearchInput onSearch={handleSearch} />
    </div>
  )
}

export default Search
