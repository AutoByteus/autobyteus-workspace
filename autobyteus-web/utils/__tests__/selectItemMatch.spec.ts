import { describe, expect, it } from 'vitest'
import { selectItemMatches } from '../selectItemMatch'

describe('selectItemMatches', () => {
  it('matches an item by its id or any alias it represents', () => {
    const item = { id: 'opus[1m]', aliasIds: ['default'] }

    expect(selectItemMatches(item, 'opus[1m]')).toBe(true)
    expect(selectItemMatches(item, 'default')).toBe(true)
    expect(selectItemMatches(item, 'sonnet')).toBe(false)
    expect(selectItemMatches({ id: 'sonnet' }, 'sonnet')).toBe(true)
  })

  it('never matches an empty value', () => {
    expect(selectItemMatches({ id: '', aliasIds: [''] }, '')).toBe(false)
    expect(selectItemMatches({ id: 'x' }, null)).toBe(false)
    expect(selectItemMatches({ id: 'x' }, undefined)).toBe(false)
  })
})
