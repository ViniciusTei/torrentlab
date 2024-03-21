import { createBrowserRouter, useRouteError } from 'react-router-dom'

import Root from './pages/root'
import App from './pages/App'
import Movie, { loader as movieLoader } from './pages/movie'
import { AxiosError } from 'axios'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: '',
        element: <App />
      },
      {
        path: '/movie/:id',
        element: <Movie />,
        loader: movieLoader,
      }
    ]
  }
])

function ErrorBoundary() {
  let error = useRouteError();
  console.trace(error)
  // Uncaught ReferenceError: path is not defined
  const displayError = () => {
    if (error instanceof AxiosError) {
      return JSON.stringify(error.toJSON(), null, 2)
    }

    return (error as Error).message
  }
  return (
    <div className="flex items-center justify-center gap-2 h-full">
      <section className="p-4">
        {displayError()}
      </section>
      <img src="/bugs.svg" width="300px" height="400px" />
    </div>
  );
}

export default router
