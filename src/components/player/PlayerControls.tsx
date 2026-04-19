import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Captions,
  Download,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Settings,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import SubtitlePanel from './SubtitlePanel'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>
  infoHash: string
  itemId: string
  showDownloadPanel: boolean
  onToggleDownloadPanel: () => void
  onSubtitleSelect: (url: string) => void
}

export default function PlayerControls({
  videoRef,
  infoHash,
  itemId,
  showDownloadPanel,
  onToggleDownloadPanel,
  onSubtitleSelect,
}: Props) {
  const navigate = useNavigate()
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onLoadedMetadata = () => setDuration(video.duration)
    const onVolumeChange = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('volumechange', onVolumeChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('volumechange', onVolumeChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [videoRef])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (playing) video.pause()
    else video.play()
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Number(e.target.value)
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current
    if (!video) return
    video.volume = Number(e.target.value)
    video.muted = false
  }

  function toggleMute() {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }

  function skipForward() {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(video.currentTime + 10, duration)
  }

  function toggleFullscreen() {
    const container = videoRef.current?.parentElement
    if (!container) return
    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(0deg, rgba(24,28,32,0.9) 0%, rgba(24,28,32,0.4) 30%, rgba(24,28,32,0) 100%)',
        }}
      />

      {/* Back button */}
      <button
        aria-label="Go back"
        className="absolute top-6 left-6 p-3 rounded-full text-white bg-black/20 hover:bg-black/40 backdrop-blur-md transition-all pointer-events-auto"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} />
      </button>

      {/* Subtitle panel */}
      {showSubtitlePanel && (
        <div className="pointer-events-auto">
          <SubtitlePanel
            infoHash={infoHash}
            itemId={itemId}
            onClose={() => setShowSubtitlePanel(false)}
            onSelect={url => {
              onSubtitleSelect(url)
              setShowSubtitlePanel(false)
            }}
          />
        </div>
      )}

      {/* Controls bar */}
      <div className="relative z-10 flex flex-col gap-4 p-6 md:p-10 pointer-events-auto">
        {/* Scrubber */}
        <div className="relative w-full h-1.5 group cursor-pointer">
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div
            className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
            style={{
              width: duration ? `${(currentTime / duration) * 100}%` : '0%',
              background: '#5870c5',
            }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-[#dce1ff] transition-colors">
              {playing
                ? <Pause size={36} fill="white" strokeWidth={0} />
                : <Play size={36} fill="white" strokeWidth={0} />
              }
            </button>

            <button onClick={skipForward} className="text-white/80 hover:text-white transition-colors">
              <SkipForward size={22} fill="white" strokeWidth={0} />
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                {muted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolume}
                className="w-20 cursor-pointer accent-white"
              />
            </div>

            <span
              className="text-sm tabular-nums"
              style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.7)' }}
            >
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-5">
            <button
              onClick={onToggleDownloadPanel}
              className="flex items-center gap-2 transition-colors"
              style={{ color: showDownloadPanel ? 'white' : 'rgba(255,255,255,0.8)' }}
            >
              <Download size={18} />
              <span
                className="text-xs tracking-widest uppercase hidden md:block"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Status
              </span>
            </button>

            <button
              onClick={() => setShowSubtitlePanel(v => !v)}
              className="flex items-center gap-2 transition-colors"
              style={{ color: showSubtitlePanel ? 'white' : 'rgba(255,255,255,0.8)' }}
            >
              <Captions size={18} />
              <span
                className="text-xs tracking-widest uppercase hidden md:block"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Subtitles
              </span>
            </button>

            <button aria-label="Settings" className="text-white/80 hover:text-white transition-colors">
              <Settings size={18} />
            </button>

            <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
