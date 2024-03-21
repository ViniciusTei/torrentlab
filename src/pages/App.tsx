import HomePageList from '@/components/home-list'
import useServices from '@/services/useServices'
import socket from '@/services/webtorrent'

function App() {
  const { useAllTrending } = useServices()
  const { data: trendingMovies } = useAllTrending()
  socket.on('connect', () => console.log('Connect to server'))

  return (
    <div className="flex flex-col items-center min-h-screen">
      {trendingMovies && (
        <HomePageList title="Em destaque" data={trendingMovies} />
      )}
    </div>
  )
}

export default App
