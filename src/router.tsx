import { AxiosError } from 'axios'
import { createBrowserRouter, redirect, useRouteError } from 'react-router-dom'

import Root from './pages/root'
import App from './pages/App'
import Movie, { loader as movieLoader } from './pages/movie'
import SearchPage, { loader as searchLoader } from './pages/search'
import TvShowPage, { loader as tvShowLoader } from './pages/tvshow'
import SetupPage from './pages/setup'
import LoginPage from './pages/login'
import SettingsPage from './pages/settings'
import DownloadsPage from './pages/downloads'
import getAPI from './services/api'

async function authLoader() {
  const state = await getAPI().me()
  if ('firstRun' in state && state.firstRun) return redirect('/setup')
  if ('authenticated' in state && !state.authenticated) return redirect('/login')
  return null
}

const router = createBrowserRouter([
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Root />,
    loader: authLoader,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '', element: <App /> },
      { path: '/movie/:id', element: <Movie />, loader: movieLoader },
      { path: '/tvshow/:id', element: <TvShowPage />, loader: tvShowLoader },
      { path: '/search', element: <SearchPage />, loader: searchLoader },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/downloads', element: <DownloadsPage /> },
    ]
  }
])

function ErrorBoundary() {
  const error = useRouteError()
  console.trace(error)
  const displayError = () => {
    if (error instanceof AxiosError) return JSON.stringify(error.toJSON(), null, 2)
    return (error as Error).message
  }
  return (
    <div className="flex items-center justify-center gap-2 h-full">
      <section className="p-4">{displayError()}</section>
      <img src="/bugs.svg" width="300px" height="400px" />
    </div>
  )
}

export default router
