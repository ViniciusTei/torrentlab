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

const DEFAULTS: SubtitleSettings = {
  fontSize: 'medium',
  color: '#ffffff',
  bgOpacity: 0.6,
  position: 'bottom',
}

function loadFromStorage(): SubtitleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
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
