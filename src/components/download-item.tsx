import { FaDownload, FaPeopleArrows } from 'react-icons/fa';
import { LuFileDown, LuTimerReset } from "react-icons/lu";
import dayjs from 'dayjs'

import { useSocketContext } from '@/context/sockets';
import { JackettItem } from '@/services/torrents'
import { Button } from '@/components/ui/button';
import { Progress } from './ui/progress';
import { formatBytes } from '@/utils/format';

interface DownloadItemProps {
  item: JackettItem
  theMovieDbId: number
}

function DownloadItem({ item, theMovieDbId }: DownloadItemProps) {
  const { activeDownloads, startDownload } = useSocketContext()
  const onDownloadItem = activeDownloads.find(i => i.itemId === item.guid)

  async function handleDownload(magnet: string) {
    startDownload({ magnet, itemId: item.guid, theMovieDbId: theMovieDbId, title: item.title, size: item.size })
  }

  const pending = !!onDownloadItem
  return (
    <>
      <Button
        type="button"
        variant="link"
        className="flex items-center justify-start gap-2 text-white"
        loading={pending}
        disabled={pending}
        aria-disabled={pending}
        onClick={() => handleDownload(item.magneturl ?? (Array.isArray(item.link) ? item.link[0] : item.link))}
      >
        <FaDownload /> <p> {item.title} </p>
      </Button>
      <div className="flex items-center gap-2">
        <Progress value={onDownloadItem ? onDownloadItem.progress * 100 : 0} className="h-2" />
        <p className="inline-flex items-center gap-1" title="Peers">
          <FaPeopleArrows /> {onDownloadItem?.peers ?? 0}
        </p>
        <p className="inline-flex items-center gap-1 min-w-fit" title="Baixado">
          <LuFileDown /> <span>{formatBytes(onDownloadItem?.downloaded ?? 0)}/{formatBytes(item.size)}</span>
        </p>
        <p className="inline-flex items-center gap-1" title="Tempo estimado">
          <LuTimerReset /> {onDownloadItem && dayjs(onDownloadItem.timeRemaining).format('hh:mm:ss')}
        </p>
      </div>
    </>
  )
}

export default DownloadItem
