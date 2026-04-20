import { useCallback, useState } from 'react'

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'
export type SubtitlePosition = 'bottom' | 'middle' | 'top'

export type SubtitleSettings = {
  fontSize: FontSize
  color: string
  bgOpacity: number
  position: SubtitlePosition
}

const STORAGE_KEY = 'subtitle-settings'

const DEFAULTS: SubtitleSettings = Object.freeze({
  fontSize: 'medium',
  color: '#ffffff',
  bgOpacity: 0.6,
  position: 'bottom',
}) as SubtitleSettings

const VALID_FONT_SIZES = new Set<string>(['small', 'medium', 'large', 'xlarge'])
const VALID_POSITIONS = new Set<string>(['bottom', 'middle', 'top'])

function loadFromStorage(): SubtitleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>
    return {
      ...DEFAULTS,
      ...(VALID_FONT_SIZES.has(parsed.fontSize as string) ? { fontSize: parsed.fontSize as FontSize } : {}),
      ...(typeof parsed.color === 'string' ? { color: parsed.color } : {}),
      ...(typeof parsed.bgOpacity === 'number' ? { bgOpacity: parsed.bgOpacity } : {}),
      ...(VALID_POSITIONS.has(parsed.position as string) ? { position: parsed.position as SubtitlePosition } : {}),
    }
  } catch {
    return DEFAULTS
  }
}

export function useSubtitleSettings(): [SubtitleSettings, (patch: Partial<SubtitleSettings>) => void] {
  const [settings, setSettings] = useState<SubtitleSettings>(loadFromStorage)

  const updateSettings = useCallback((patch: Partial<SubtitleSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable — proceed without persisting
      }
      return next
    })
  }, [])

  return [settings, updateSettings]
}
