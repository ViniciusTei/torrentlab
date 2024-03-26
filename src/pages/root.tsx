import { GoHome } from 'react-icons/go'
import { TbMovie } from 'react-icons/tb'
import { BsFillCollectionPlayFill } from 'react-icons/bs'
import { Link, Outlet, useNavigation, useNavigate } from 'react-router-dom'

import SearchInput from '@/components/search-input'
import { Toaster } from '@/components/ui/toaster'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useCounter } from '@/utils/counter'

export default function Root() {
  const value = useCounter()
  const navigation = useNavigation()
  const navigate = useNavigate()

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
              <Link to="/movies" className="flex gap-1 items-center cursor-pointer">
                <TbMovie /> Movies
              </Link>
            </li>
            <li className="flex gap-1 items-center cursor-pointer text-gray-100">
              <BsFillCollectionPlayFill /> Tv shows
            </li>
          </ul>
        </nav>
        <div>
          <SearchInput onSearch={(ev) => navigate(`/search?query=${ev}`)} />
        </div>
      </header>
      <main className="flex-1 mx-16">
        <Outlet />
        {['loading', 'submiting'].includes(navigation.state) && <Loading />}
        <Toaster />
      </main>
    </>
  )
}

function Loading() {
  return (
    <div className="px-12 py-4 inline-flex gap-6 w-full">
      <Skeleton className="h-[180px] w-[240px]" />

      <div className="flex-1 h-full w-full">
        {[0, 1, 2].map(item => (
          <Skeleton key={item} className="h-[180px] w-full rounded-lg mb-4" />
        ))}
      </div>

    </div>
  )
}
