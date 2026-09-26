import { describe, expect, it } from 'vitest'
import { relativeTimeMessage } from '../relativeTime'

const NOW = Date.UTC(2026, 8, 26, 12, 0, 0)
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe('relativeTimeMessage', () => {
  it.each([
    [10_000, { key: 'projects.time.justNow' }],
    [5 * 60_000, { key: 'projects.time.minutesAgo', params: { count: 5 } }],
    [2 * 3_600_000, { key: 'projects.time.hoursAgo', params: { count: 2 } }],
    [3 * 86_400_000, { key: 'projects.time.daysAgo', params: { count: 3 } }],
    [15 * 86_400_000, { key: 'projects.time.weeksAgo', params: { count: 2 } }],
  ])('describes %ims ago', (delta, expected) => {
    expect(relativeTimeMessage(ago(delta), NOW)).toEqual(expected)
  })

  it('returns null for old or invalid timestamps so the caller shows a date', () => {
    expect(relativeTimeMessage(ago(60 * 86_400_000), NOW)).toBeNull()
    expect(relativeTimeMessage('not a date', NOW)).toBeNull()
  })

  it('treats future timestamps as just now', () => {
    expect(relativeTimeMessage(new Date(NOW + 5_000).toISOString(), NOW)).toEqual({ key: 'projects.time.justNow' })
  })
})
