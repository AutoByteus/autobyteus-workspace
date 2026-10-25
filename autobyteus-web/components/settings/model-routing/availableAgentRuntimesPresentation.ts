import type {
  AutoByteusEntry, AvailableAgentRuntimeEntry, AvailableModel, UnknownText,
} from '~/types/availableAgentRuntimes'

export const isAutoByteusEntry = (entry: AvailableAgentRuntimeEntry): entry is AutoByteusEntry =>
  entry.runtime === 'autobyteus'

/** The reason of an `unknown: <reason>` value; null for anything else. */
export const unknownReason = (value: unknown): string | null =>
  typeof value === 'string' && value.startsWith('unknown: ') ? (value as UnknownText).slice('unknown: '.length) : null

export const blockedCount = (models: AvailableModel[]): number => models.filter((model) => model.blocked).length

/**
 * A time in the user's locale and time zone: "14:35" today, otherwise with its date ("Oct 30, 20:57"). An invalid time
 * stays as given.
 */
export const localTime = (iso: string, locale: string, now: Date = new Date()): string => {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return at.toDateString() === now.toDateString()
    ? new Intl.DateTimeFormat(locale || 'en', time).format(at)
    : new Intl.DateTimeFormat(locale || 'en', { month: 'short', day: 'numeric', ...time }).format(at)
}

/** A context size, short: 400000 → "400K", 1000000 → "1M". */
export const shortTokens = (tokens: number, locale: string): string =>
  new Intl.NumberFormat(locale || 'en', { notation: 'compact', maximumFractionDigits: 1 }).format(tokens)
