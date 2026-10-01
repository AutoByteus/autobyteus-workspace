import { describe, expect, it } from 'vitest'
import { pathBreakSegments } from '../pathBreakSegments'

describe('pathBreakSegments', () => {
  it('keeps separators at the end of each segment and loses no characters', () => {
    const path = '/Users/normy/autobyteus-web'
    expect(pathBreakSegments(path)).toEqual(['/', 'Users/', 'normy/', 'autobyteus-web'])
    expect(pathBreakSegments(path).join('')).toBe(path)
  })

  it('handles Windows separators and trailing separators', () => {
    expect(pathBreakSegments('C:\\work\\repo\\').join('')).toBe('C:\\work\\repo\\')
    expect(pathBreakSegments('C:\\work\\repo')).toEqual(['C:\\', 'work\\', 'repo'])
  })
})
