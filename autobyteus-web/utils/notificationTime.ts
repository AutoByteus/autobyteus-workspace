/**
 * A notification's short relative time per locale ("3 hr. ago", "yesterday", "3小时前"): minutes
 * under an hour, hours under a day, then days.
 */
export const shortRelativeTime = (iso: string, locale: string, now: number = Date.now()): string => {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const format = new Intl.RelativeTimeFormat(locale || 'en', { numeric: 'auto', style: 'short' })
  const abs = Math.abs(seconds)
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return format.format(Math.round(seconds / 3600), 'hour')
  return format.format(Math.round(seconds / 86_400), 'day')
}

/** The full local date and time, for the row's `title`. */
export const fullLocalTime = (iso: string, locale: string): string => new Date(iso).toLocaleString(locale || 'en')
