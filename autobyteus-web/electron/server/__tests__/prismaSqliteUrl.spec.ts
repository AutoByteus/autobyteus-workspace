import { describe, expect, it } from 'vitest'
import { toPrismaSqliteUrl } from '../prismaSqliteUrl'

describe('toPrismaSqliteUrl', () => {
  it('preserves macOS and Linux absolute sqlite paths', () => {
    expect(toPrismaSqliteUrl('/Users/tester/.autobyteus/server-data/db/production.db')).toBe(
      'file:/Users/tester/.autobyteus/server-data/db/production.db'
    )
    expect(toPrismaSqliteUrl('/home/tester/.autobyteus/server-data/db/production.db')).toBe(
      'file:/home/tester/.autobyteus/server-data/db/production.db'
    )
  })

  it('formats Windows drive sqlite paths without an invalid leading slash', () => {
    expect(toPrismaSqliteUrl('C:\\Users\\tester\\.autobyteus\\server-data\\db\\production.db')).toBe(
      'file:C:/Users/tester/.autobyteus/server-data/db/production.db'
    )
  })

  it('preserves relative sqlite paths for development configurations', () => {
    expect(toPrismaSqliteUrl('./db/dev.db')).toBe('file:./db/dev.db')
  })
})
