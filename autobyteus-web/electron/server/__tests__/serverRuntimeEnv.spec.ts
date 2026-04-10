import { describe, expect, it } from 'vitest'
import { buildServerRuntimeEnv } from '../serverRuntimeEnv'

describe('buildServerRuntimeEnv', () => {
  it('builds sqlite runtime env values from app data dir', () => {
    const env = buildServerRuntimeEnv(
      '/Users/tester/.autobyteus/server-data',
      'http://192.168.1.2:29695',
      {}
    )

    expect(env.DATABASE_URL).toBe('file:/Users/tester/.autobyteus/server-data/db/production.db')
    expect(env.DB_TYPE).toBe('sqlite')
    expect(env.AUTOBYTEUS_SERVER_HOST).toBe('http://192.168.1.2:29695')
  })

  it('normalizes windows-style db paths for prisma file URLs', () => {
    const env = buildServerRuntimeEnv(
      'C:\\Users\\tester\\.autobyteus\\server-data',
      'http://localhost:29695',
      {}
    )

    expect(env.DATABASE_URL).toBe('file:/C:/Users/tester/.autobyteus/server-data/db/production.db')
  })

  it('keeps explicitly provided database env overrides', () => {
    const env = buildServerRuntimeEnv('/tmp/server-data', 'http://localhost:29695', {
      DB_TYPE: 'sqlite'
    })

    expect(env.DB_TYPE).toBe('sqlite')
  })

  it('merges runtime override values after the default runtime env is built', () => {
    const env = buildServerRuntimeEnv(
      '/tmp/server-data',
      'http://localhost:29695',
      {},
      {
        AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL: 'http://127.0.0.1:41234',
        AUTOBYTEUS_BROWSER_BRIDGE_TOKEN: 'browser-token'
      }
    )

    expect(env.AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL).toBe('http://127.0.0.1:41234')
    expect(env.AUTOBYTEUS_BROWSER_BRIDGE_TOKEN).toBe('browser-token')
  })
})
