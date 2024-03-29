import { useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface Props {
  onSearch: (value: string) => void
}

function SearchInput({ onSearch }: Props) {
  const [search, setSearch] = useState<string>()

  async function handleSearch() {
    if (search) {
      onSearch(search)
      setSearch('')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <Input
        value={search}
        className="rounded-lg pl-1 text-sm h-12 bg-gray-700 text-white"
        placeholder="Buscar filme"
        onChange={(ev) => setSearch(ev.target.value)}
        onKeyUp={(ev) => {
          if (ev.key === "Enter") {
            handleSearch()
          }
        }}
      />
      <Button onClick={handleSearch} className="h-12 w-12 bg-transparent cursor-pointer">
        <FaSearch size="1.1rem" />
      </Button>
    </div>
  )
}

export default SearchInput
