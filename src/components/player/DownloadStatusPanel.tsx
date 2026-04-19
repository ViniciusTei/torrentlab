import { X } from 'lucide-react'
import { useSocketContext } from '@/context/sockets'
import { formatBytes, formatDuration } from '@/utils/format'

type Props = {
  infoHash: string
  onClose: () => void
}

export default function DownloadStatusPanel({ infoHash, onClose }: Props) {
  const { activeDownloads } = useSocketContext()
  const item = activeDownloads.find(d => d.infoHash === infoHash)

  if (!item) return null

  return (
    <div className="absolute top-6 right-6 w-72 backdrop-blur-xl bg-white/70 p-5 rounded-xl border border-white/30 shadow-xl flex flex-col gap-4 z-20">
      <div className="flex items-center justify-between">
        <span
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#3e56aa' }}
        >
          Live Archive Sync
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          style={{ color: '#444651' }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#444651' }}>
            Downloading
          </span>
          <span
            className="text-lg font-bold"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}
          >
            {Math.round(item.progress * 100)}%
          </span>
        </div>

        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e0e2e7' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(item.progress * 100, 100)}%`, background: '#3e56aa' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-y-4 pt-2">
          {item.downloadSpeed > 0 ? (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
                Speed
              </span>
              <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
                {formatBytes(item.downloadSpeed)}/s
              </span>
            </div>
          ) : <div />}
          {item.timeRemaining > 0 ? (
            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
                ETA
              </span>
              <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
                {formatDuration(item.timeRemaining)}
              </span>
            </div>
          ) : <div />}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
              Peers
            </span>
            <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
              {item.peers}
            </span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] uppercase tracking-tighter font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#757683' }}>
              Downloaded
            </span>
            <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#181c20' }}>
              {formatBytes(item.downloaded)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
