import type { SubtitleSettings } from '@/hooks/useSubtitleSettings'

const FONT_SIZES: { label: string; value: SubtitleSettings['fontSize'] }[] = [
  { label: 'S', value: 'small' },
  { label: 'M', value: 'medium' },
  { label: 'L', value: 'large' },
  { label: 'XL', value: 'xlarge' },
]

const POSITIONS: { label: string; value: SubtitleSettings['position'] }[] = [
  { label: 'Top', value: 'top' },
  { label: 'Middle', value: 'middle' },
  { label: 'Bottom', value: 'bottom' },
]

const COLOR_SWATCHES = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Cyan', value: '#22d3ee' },
  { label: 'Green', value: '#4ade80' },
]

type Props = {
  settings: SubtitleSettings
  onUpdate: (patch: Partial<SubtitleSettings>) => void
}

export default function SettingsPanel({ settings, onUpdate }: Props) {
  return (
    <div
      className="absolute bottom-28 right-6 w-72 backdrop-blur-xl bg-white/70 rounded-xl border border-white/30 shadow-xl z-20 overflow-hidden"
    >
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}
      >
        <span
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#3e56aa' }}
        >
          Subtitle Settings
        </span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-4">
        {/* Font Size */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Font Size
          </span>
          <div className="flex gap-1">
            {FONT_SIZES.map(({ label, value }) => (
              <button
                type="button"
                key={value}
                onClick={() => onUpdate({ fontSize: value })}
                className="flex-1 py-1 rounded text-xs font-semibold transition-colors"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: settings.fontSize === value ? '#3e56aa' : 'rgba(62,86,170,0.08)',
                  color: settings.fontSize === value ? '#fff' : '#3e56aa',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Text Color
          </span>
          <div className="flex items-center gap-2">
            {COLOR_SWATCHES.map(({ label, value }) => (
              <button
                type="button"
                key={value}
                title={label}
                onClick={() => onUpdate({ color: value })}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{
                  background: value,
                  borderColor: settings.color === value ? '#3e56aa' : 'transparent',
                  boxShadow: settings.color === value ? '0 0 0 2px rgba(62,86,170,0.3)' : undefined,
                }}
              />
            ))}
            <label
              title="Custom color"
              className="w-7 h-7 rounded-full border-2 overflow-hidden cursor-pointer flex items-center justify-center transition-all"
              style={{
                borderColor: !COLOR_SWATCHES.some(s => s.value === settings.color) ? '#3e56aa' : 'rgba(0,0,0,0.15)',
                background: settings.color,
              }}
            >
              <input
                type="color"
                value={settings.color}
                onChange={e => onUpdate({ color: e.target.value })}
                className="sr-only"
              />
              {COLOR_SWATCHES.some(s => s.value === settings.color) && (
                <span className="text-[10px] text-black/40 select-none">+</span>
              )}
            </label>
          </div>
        </div>

        {/* Background Opacity */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Background Opacity — {Math.round(settings.bgOpacity * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.bgOpacity}
            onChange={e => onUpdate({ bgOpacity: Number(e.target.value) })}
            className="w-full cursor-pointer accent-[#3e56aa]"
          />
        </div>

        {/* Position */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: '#444651', fontFamily: 'Inter, sans-serif' }}>
            Position
          </span>
          <div className="flex gap-1">
            {POSITIONS.map(({ label, value }) => (
              <button
                type="button"
                key={value}
                onClick={() => onUpdate({ position: value })}
                className="flex-1 py-1 rounded text-xs font-semibold transition-colors"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: settings.position === value ? '#3e56aa' : 'rgba(62,86,170,0.08)',
                  color: settings.position === value ? '#fff' : '#3e56aa',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
