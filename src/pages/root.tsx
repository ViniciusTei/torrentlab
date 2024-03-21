import { GoHome } from 'react-icons/go'
import { TbMovie } from 'react-icons/tb'
import { BsFillCollectionPlayFill } from 'react-icons/bs'
import { Link, Outlet, useNavigation } from 'react-router-dom'

import SearchInput from '@/components/search-input'
import { Toaster } from '@/components/ui/toaster'
import { Progress } from '@/components/ui/progress'
import { useEffect, useState } from 'react'

const useCounter = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      if (count < 100) {
        setCount((prevCount) => prevCount + 25);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [count]);
  return count;
}

export default function Root() {
  const value = useCounter()
  const navigation = useNavigation()

  return (
    <>
      {navigation.state === 'loading' && <Progress value={value} />}

      <header className="flex items-center my-1 mx-16">
        <img src="/bd-logo.svg" alt="Logo" className="p-1 mr-2" width="37px" height="41px" />
        <nav className="flex-1">
          <ul className="flex gap-2">
            <li>
              <Link to="/" className="flex gap-1 items-center cursor-pointer">
                <GoHome /> Home
              </Link>
            </li>
            <li className="flex gap-1 items-center cursor-pointer text-gray-100">
              <TbMovie /> Movies
            </li>
            <li className="flex gap-1 items-center cursor-pointer text-gray-100">
              <BsFillCollectionPlayFill /> Tv shows
            </li>
          </ul>
        </nav>
        <div>
          <SearchInput onSearch={(ev) => console.log(ev)} />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />

        <Toaster />
      </main>
    </>
  )
}
