import { useEffect, useState } from "react"
import socket from './webtorrent'

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

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
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
