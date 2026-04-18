import { useQueryClient } from '@tanstack/react-query'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import socket from '@/services/webtorrent'

export type DownloadItem = {
  itemId: string
  title: string
  size: number
  peers: number
  downloaded: number
  timeRemaining: number
  progress: number
}

export type DownloadProps = {
  magnet: string
  itemId: string
  theMovieDbId: number
  title: string
  size: number
}

type SocketContextType = {
  isConnected: boolean
  activeDownloads: DownloadItem[]
  startDownload: (props: DownloadProps) => void
}

const SocketContext = createContext<SocketContextType | null>(null)

function useDownloadSocket(): SocketContextType {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeDownloads, setActiveDownloads] = useState<DownloadItem[]>([])
  const [isConnected, setIsConnected] = useState(socket.connected)

  function startDownload({ magnet, itemId, theMovieDbId, title, size }: DownloadProps) {
    socket.emit('download', { magnet, itemId, theMovieDbId })
    setActiveDownloads(prev => [
      ...prev,
      { itemId, title, size, progress: 0, peers: 0, downloaded: 0, timeRemaining: 0 },
    ])
    toast({ title: 'Download iniciado', description: title })
  }

  useEffect(() => {
    function onConnect() {
      setIsConnected(true)
      socket.emit('ready', 'Start', (res: unknown) => console.log(res))
    }

    function onDisconnect() {
      setIsConnected(false)
    }

    function onProgress(value: Omit<DownloadItem, 'title' | 'size'>) {
      setActiveDownloads(prev =>
        prev.map(i => (i.itemId === value.itemId ? { ...i, ...value } : i))
      )
    }

    function onDone({ itemId }: { itemId: string }) {
      setActiveDownloads(prev => {
        const item = prev.find(i => i.itemId === itemId)
        queryClient.invalidateQueries({ queryKey: ['downloads'] })
        toast({ title: 'Download finalizado', description: item?.title })
        return prev.filter(i => i.itemId !== itemId)
      })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('downloaded', onProgress)
    socket.on('done', onDone)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('downloaded', onProgress)
      socket.off('done', onDone)
    }
  }, [queryClient, toast])

  return { isConnected, activeDownloads, startDownload }
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const value = useDownloadSocket()
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export const useSocketContext = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider')
  return ctx
}
