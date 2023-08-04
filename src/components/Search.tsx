'use client'

import { useState } from 'react'
import { FaSearch } from 'react-icons/fa'

function SearchInput() {
  const [search, setSearch] = useState<string>()

  async function handleSearch() {
    if (search) {
      alert(`Search for ${search}`)
      setSearch(undefined)
    }
  }

  return (
    <div>
      <input className="rounded-lg mr-2 h-5 pl-1 text-sm bg-gray-700 text-white" placeholder="Buscar filme" onChange={(ev) => setSearch(ev.target.value)}/>
      <button onClick={handleSearch} className="h-12 w-12 bg-transparent cursor-pointer">
        <FaSearch size="1.1rem"/>
      </button>
    </div>
  )
}

export default SearchInput
