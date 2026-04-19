import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type Subtitle = {
  filename: string
  url: string
}

type Props = {
  infoHash: string
  itemId: string
  onClose: () => void
  onSelect: (url: string) => void
}

export default function SubtitlePanel({ infoHash, itemId, onClose, onSelect }: Props) {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function fetchSubtitles() {
    const token = localStorage.getItem('token') ?? ''
    setLoading(true)
    setError(false)
    fetch(`/api/local-subtitles/${infoHash}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json() as Promise<Subtitle[]>
      })
      .then(data => {
        setSubtitles(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSubtitles()
  }, [infoHash])

  return (
    <div
      className="absolute bottom-28 right-6 w-80 backdrop-blur-xl bg-white/70 rounded-xl border border-white/30 shadow-xl z-20 overflow-hidden"
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <span
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#3e56aa' }}
        >
          Subtitles
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-6">
          <Loader2 size={20} className="animate-spin" style={{ color: '#3e56aa' }} />
        </div>
      )}

      {error && (
        <div className="p-4 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#444651' }}>
          Could not load subtitles.{' '}
          <button onClick={fetchSubtitles} className="underline" style={{ color: '#3e56aa' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && subtitles.length === 0 && (
        <div className="p-4 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#444651' }}>
          No subtitles downloaded.{' '}
          {itemId && (
            <Link
              to={`/movie/${itemId}`}
              className="hover:underline"
              style={{ color: '#3e56aa' }}
              onClick={onClose}
            >
              Go to details page to download subtitles →
            </Link>
          )}
        </div>
      )}

      {!loading && !error && subtitles.length > 0 && (
        <ul>
          {subtitles.map(sub => (
            <li key={sub.filename}>
              <button
                className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#f2f4f9]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#181c20' }}
                onClick={() => {
                  const token = localStorage.getItem('token') ?? ''
                  onSelect(`${sub.url}?token=${encodeURIComponent(token)}`)
                }}
              >
                {sub.filename}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
