export type CueEntry = {
  start: number // seconds
  end: number   // seconds
  text: string
}

function timeToSeconds(time: string): number {
  // Accepts HH:MM:SS,mmm or HH:MM:SS.mmm
  const [hms, ms] = time.replace('.', ',').split(',')
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + s + Number(ms ?? 0) / 1000
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

export function parseSrt(raw: string): CueEntry[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized.split(/\n{2,}/)
  const cues: CueEntry[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // First line is the cue index (number) — skip it
    const timeLine = lines[1]
    const textLines = lines.slice(2)

    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    )
    if (!timeMatch) continue

    const start = timeToSeconds(timeMatch[1])
    const end = timeToSeconds(timeMatch[2])
    const text = textLines.map(stripHtml).join('\n').trim()

    if (text) {
      cues.push({ start, end, text })
    }
  }

  return cues
}
