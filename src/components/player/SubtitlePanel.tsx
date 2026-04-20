import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Upload } from 'lucide-react'

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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchSubtitles = useCallback(() => {
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
  }, [infoHash])

  useEffect(() => {
    fetchSubtitles()
  }, [fetchSubtitles])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const token = localStorage.getItem('token') ?? ''
    const formData = new FormData()
    formData.append('subtitle', file)

    setUploading(true)
    try {
      const res = await fetch(`/api/subtitle-upload/${infoHash}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) throw new Error()
      fetchSubtitles()
    } catch {
      // silently ignore — list stays as-is
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="absolute bottom-28 right-6 w-80 backdrop-blur-xl bg-white/70 rounded-xl border border-white/30 shadow-xl z-20 overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <span
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#3e56aa' }}
        >
          Subtitles
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-80 disabled:opacity-40"
          style={{ color: '#3e56aa', fontFamily: 'Inter, sans-serif' }}
          title="Upload .srt file"
        >
          {uploading
            ? <Loader2 size={13} className="animate-spin" />
            : <Upload size={13} />
          }
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt"
          className="hidden"
          onChange={handleUpload}
        />
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
                  onClose()
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
