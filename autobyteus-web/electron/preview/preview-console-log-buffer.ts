export type PreviewConsoleLogLevel = 'log' | 'info' | 'warn' | 'error'

export type PreviewConsoleLogEntry = {
  sequence: number
  level: PreviewConsoleLogLevel
  message: string
  timestamp_iso: string
}

const normalizeConsoleLevel = (level: number): PreviewConsoleLogLevel => {
  switch (level) {
    case 1:
      return 'info'
    case 2:
      return 'warn'
    case 3:
      return 'error'
    default:
      return 'log'
  }
}

export class PreviewConsoleLogBuffer {
  private readonly entries: PreviewConsoleLogEntry[] = []
  private nextSequence = 1

  constructor(private readonly maxEntries: number = 500) {}

  append(level: number, message: string): void {
    this.entries.push({
      sequence: this.nextSequence,
      level: normalizeConsoleLevel(level),
      message,
      timestamp_iso: new Date().toISOString(),
    })
    this.nextSequence += 1

    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries)
    }
  }

  list(sinceSequence: number | null | undefined): {
    entries: PreviewConsoleLogEntry[]
    nextSequence: number
  } {
    const normalizedSinceSequence =
      typeof sinceSequence === 'number' && Number.isFinite(sinceSequence) ? sinceSequence : null

    return {
      entries:
        normalizedSinceSequence === null
          ? [...this.entries]
          : this.entries.filter((entry) => entry.sequence > normalizedSinceSequence),
      nextSequence: this.nextSequence,
    }
  }
}
