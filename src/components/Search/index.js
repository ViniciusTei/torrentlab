import React, { useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import styles from './styles.module.css'

function SearchInput({ onSearchChange }) {
  const [search, setSearch] = useState()

  async function handleSearch() {
    if (search) {
      onSearchChange(search)
      setSearch(undefined)
    }
  }

  return (
    <div className={styles.search}>
      <input type="text" placeholder="Buscar filme" onChange={(ev) => setSearch(ev.target.value)}/>
      <button onClick={handleSearch}>
        <FaSearch size="1.1rem"/>
      </button>
    </div>
  )
}

export default SearchInput
