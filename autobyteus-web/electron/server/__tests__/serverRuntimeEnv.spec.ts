import { describe, expect, it } from 'vitest'
import { buildServerRuntimeEnv } from '../serverRuntimeEnv'

describe('buildServerRuntimeEnv', () => {
  it('builds sqlite runtime env values from app data dir', () => {
    const env = buildServerRuntimeEnv('/Users/tester/.autobyteus/server-data', {})

    expect(env.DATABASE_URL).toBe('file:/Users/tester/.autobyteus/server-data/db/production.db')
    expect(env.PERSISTENCE_PROVIDER).toBe('sqlite')
    expect(env.DB_TYPE).toBe('sqlite')
    expect(env.AUTOBYTEUS_DATA_DIR).toBe('/Users/tester/.autobyteus/server-data')
  })

  it('normalizes windows-style db paths for prisma file URLs', () => {
    const env = buildServerRuntimeEnv('C:\\Users\\tester\\.autobyteus\\server-data', {})

    expect(env.DATABASE_URL).toBe('file:/C:/Users/tester/.autobyteus/server-data/db/production.db')
  })

  it('keeps explicit persistence env overrides', () => {
    const env = buildServerRuntimeEnv('/tmp/server-data', {
      PERSISTENCE_PROVIDER: 'postgresql',
      DB_TYPE: 'postgresql'
    })

    expect(env.PERSISTENCE_PROVIDER).toBe('postgresql')
    expect(env.DB_TYPE).toBe('postgresql')
  })
})
