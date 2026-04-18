import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useSocketContext } from '@/context/sockets'
import { Progress } from '@/components/ui/progress'
import { formatBytes, formatDuration } from '@/utils/format'

export default function PlayerPage() {
  const { infoHash } = useParams<{ infoHash: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const title = searchParams.get('title') ?? 'Sem título'
  const { activeDownloads } = useSocketContext()
  const activeItem = activeDownloads.find(d => d.infoHash === infoHash)

  if (!infoHash) return null

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center gap-4 px-6 py-4 bg-slate-900">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Voltar
        </button>
        <h1 className="font-semibold text-lg truncate">{title}</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <video
          key={infoHash}
          src={`/api/stream/${infoHash}`}
          controls
          autoPlay
          className="w-full max-w-5xl rounded-lg bg-slate-900"
        />

        {activeItem && (
          <div className="w-full max-w-5xl mt-4 bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Progress value={activeItem.progress * 100} className="h-2 flex-1" />
              <span className="text-sm text-slate-400 min-w-fit">
                {Math.round(activeItem.progress * 100)}%
              </span>
            </div>
            <div className="flex gap-4 text-sm text-slate-400">
              <span>{activeItem.peers} peers</span>
              <span>{formatBytes(activeItem.downloaded)}/{formatBytes(activeItem.size)}</span>
              {activeItem.timeRemaining > 0 && (
                <span>{formatDuration(activeItem.timeRemaining)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
