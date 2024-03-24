import { useEffect, useState } from "react"
import socket from './webtorrent'
import { useToast } from "@/components/ui/use-toast"

type DownloadItem = {
  itemId: string
  peers: number
  downloaded: number
  timeRemaining: number
  progress: number
}

function useSockets() {
  const [onDownloadItems, setOnDownloadItems] = useState<DownloadItem[]>([])
  const [isConnected, setIsConnected] = useState(socket.connected)
  const { toast } = useToast()

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

  return {
    isConnected,
    onDownloadItems,
  }
}

export default useSockets
