import { describe, expect, it } from 'vitest'
import { shortRelativeTime } from '../notificationTime'

const NOW = Date.parse('2026-10-20T12:00:00.000Z')
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe('shortRelativeTime', () => {
  it('uses minutes under an hour, hours under a day, then days, per locale', () => {
    expect(shortRelativeTime(ago(5 * 60), 'en', NOW)).toBe('5 min. ago')
    expect(shortRelativeTime(ago(3 * 3600), 'en', NOW)).toBe('3 hr. ago')
    expect(shortRelativeTime(ago(26 * 3600), 'en', NOW)).toBe('yesterday')
    expect(shortRelativeTime(ago(2 * 86_400), 'en', NOW)).toBe('2 days ago')
    expect(shortRelativeTime(ago(3 * 3600), 'zh-CN', NOW)).toBe('3小时前')
    expect(shortRelativeTime(ago(26 * 3600), 'zh-CN', NOW)).toBe('昨天')
  })
})
