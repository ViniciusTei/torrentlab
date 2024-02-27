'use client'
import Link from 'next/link'
import { GoHome } from 'react-icons/go'
import { TbMovie } from 'react-icons/tb'
import { BsFillCollectionPlayFill } from 'react-icons/bs'

import SearchInput from './Search'

function NavHeader() {
  return (
    <div className="flex items-center my-1 mx-16">
      <img src="/bd-logo.svg" alt="Logo" className="p-1 mr-2" width="37px" height="41px" />
      <nav className="flex-1">
        <ul className="flex gap-2">
          <li>
            <Link href="/" className="flex gap-1 items-center cursor-pointer">
              <GoHome /> Home
            </Link>
          </li>
          <li className="flex gap-1 items-center cursor-pointer text-gray-100"><TbMovie /> Movies</li>
          <li className="flex gap-1 items-center cursor-pointer text-gray-100"><BsFillCollectionPlayFill />Tv shows</li>
        </ul>
      </nav>
      <div>
        <SearchInput />
      </div>
    </div>
  )
}

export default NavHeader
