export interface RelativeTimeMessage {
  key: string
  params?: Record<string, number>
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/**
 * Describes how long ago an ISO timestamp was, as a translation key plus count, so the
 * caller can localise it (`projects.time.*`). Past four weeks the caller shows the date.
 */
export const relativeTimeMessage = (isoTime: string, now: number = Date.now()): RelativeTimeMessage | null => {
  const time = Date.parse(isoTime)
  if (!Number.isFinite(time)) {
    return null
  }
  const delta = Math.max(0, now - time)
  if (delta < MINUTE) return { key: 'projects.time.justNow' }
  if (delta < HOUR) return { key: 'projects.time.minutesAgo', params: { count: Math.floor(delta / MINUTE) } }
  if (delta < DAY) return { key: 'projects.time.hoursAgo', params: { count: Math.floor(delta / HOUR) } }
  if (delta < WEEK) return { key: 'projects.time.daysAgo', params: { count: Math.floor(delta / DAY) } }
  if (delta < 4 * WEEK) return { key: 'projects.time.weeksAgo', params: { count: Math.floor(delta / WEEK) } }
  return null
}
