import type { CueEntry } from '@/lib/parseSrt'
import type { SubtitleSettings } from '@/hooks/useSubtitleSettings'

const FONT_SIZE_MAP: Record<SubtitleSettings['fontSize'], number> = {
  small: 16,
  medium: 20,
  large: 26,
  xlarge: 32,
}

type Props = {
  cues: CueEntry[]
  currentTime: number
  settings: SubtitleSettings
}

export default function SubtitleOverlay({ cues, currentTime, settings }: Props) {
  const activeCue = cues.find(c => currentTime >= c.start && currentTime <= c.end)

  if (!activeCue) return null

  const positionStyle: React.CSSProperties =
    settings.position === 'bottom'
      ? { bottom: '10%', left: 0, right: 0 }
      : settings.position === 'top'
      ? { top: '10%', left: 0, right: 0 }
      : { top: '50%', left: 0, right: 0, transform: 'translateY(-50%)' }

  return (
    <div
      className="absolute pointer-events-none flex justify-center px-4"
      style={positionStyle}
    >
      <span
        style={{
          display: 'inline-block',
          fontSize: FONT_SIZE_MAP[settings.fontSize],
          color: settings.color,
          background: `rgba(0,0,0,${settings.bgOpacity})`,
          padding: '4px 12px',
          borderRadius: 6,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.4,
        }}
      >
        {activeCue.text}
      </span>
    </div>
  )
}
