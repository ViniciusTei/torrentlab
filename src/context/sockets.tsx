import { useToast } from '@/components/ui/use-toast'
import socket from '@/services/webtorrent'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

type DownloadItem = {
  itemId: string
  peers: number
  downloaded: number
  timeRemaining: number
  progress: number
}

type DownloadProps = {
  magnet: string
  itemId: string
  theMovieDbId: number
}

const SocketContext = createContext({} as any)

function SocketProvier({ children }: { children: ReactNode }) {
  const [onDownloadItems, setOnDownloadItems] = useState<DownloadItem[]>([])
  const [isConnected, setIsConnected] = useState(socket.connected)
  const { toast } = useToast()

  const startDownload = ({ magnet, itemId, theMovieDbId }: DownloadProps) => {
    socket.emit('download', { magnet, itemId, theMovieDbId })
  }

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      socket.emit('ready', 'Start', (res: any) => console.log(res))
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onEvent(value: DownloadItem) {
      const allItems = onDownloadItems.filter(i => i.itemId !== value.itemId)
      setOnDownloadItems([...allItems, value])
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('downloaded', onEvent)
    socket.on('done', function onDone() {
      toast({
        title: 'Download finalizado',
        description: 'Abra na pasta para visualizar o arquivo.',
        variant: 'default'
      })
    })

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('downloaded', onEvent)
    }
  }, [])

  return (
    <SocketContext.Provider value={{
      isConnected,
      onDownloadItems,
      startDownload,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocketContext = () => {
  return useContext(SocketContext)
}

export default SocketProvier
