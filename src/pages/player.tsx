import { useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import PlayerControls from '@/components/player/PlayerControls'
import DownloadStatusPanel from '@/components/player/DownloadStatusPanel'

export default function PlayerPage() {
  const { infoHash } = useParams<{ infoHash: string }>()
  const [searchParams] = useSearchParams()
  const title = searchParams.get('title') ?? 'Sem título'
  const itemId = searchParams.get('itemId') ?? ''

  const videoRef = useRef<HTMLVideoElement>(null)
  const [showDownloadPanel, setShowDownloadPanel] = useState(true)
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string | null>(null)

  if (!infoHash) return null

  const token = localStorage.getItem('token') ?? ''
  const streamUrl = `/api/stream/${infoHash}?token=${encodeURIComponent(token)}`

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: '#f7f9fe', padding: '4rem 1rem 2rem' }}
    >
      <div className="relative w-full max-w-screen-2xl aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
        <video
          ref={videoRef}
          key={infoHash}
          src={streamUrl}
          autoPlay
          className="w-full h-full object-contain"
        >
          {activeSubtitleUrl && (
            <track kind="subtitles" src={activeSubtitleUrl} default />
          )}
        </video>

        <PlayerControls
          videoRef={videoRef}
          infoHash={infoHash}
          title={title}
          itemId={itemId}
          showDownloadPanel={showDownloadPanel}
          onToggleDownloadPanel={() => setShowDownloadPanel(v => !v)}
          onSubtitleSelect={setActiveSubtitleUrl}
        />

        {showDownloadPanel && (
          <DownloadStatusPanel
            infoHash={infoHash}
            onClose={() => setShowDownloadPanel(false)}
          />
        )}
      </div>
    </div>
  )
}
