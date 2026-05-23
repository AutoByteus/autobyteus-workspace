import * as fsSync from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { NodeAdminClaimStore } from '../nodeAdminClaimStore'
import {
  NODE_ADMIN_CLAIM_ID_HEADER,
  NODE_ADMIN_CLAIM_SECRET_HEADER,
} from '../../types/nodeAdminClaim'

const tempDirs: string[] = []

const makeStore = (): NodeAdminClaimStore => {
  const tempDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-node-admin-claims-'))
  tempDirs.push(tempDir)
  return new NodeAdminClaimStore(tempDir)
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fsSync.rmSync(tempDir, { recursive: true, force: true })
  }
})

describe('NodeAdminClaimStore', () => {
  it('returns only redacted summaries while headers retain the request-only raw claim', () => {
    const store = makeStore()

    const summary = store.register({
      nodeId: ' docker-node-1 ',
      managementBaseUrl: ' http://127.0.0.1:8001/ ',
      claimId: ' nac_test_claim ',
      rawSecret: ' nas_super_secret ',
    })

    expect(summary).toMatchObject({
      status: 'configured',
      nodeId: 'docker-node-1',
      managementBaseUrl: 'http://127.0.0.1:8001',
      claimIdSuffix: '_claim',
    })
    expect(JSON.stringify(summary)).not.toContain('nas_super_secret')

    const headers = store.getHeaders('docker-node-1', 'http://127.0.0.1:8001')

    expect(headers.ok).toBe(true)
    if (!headers.ok) {
      throw new Error('Expected stored claim headers to be available')
    }
    expect(headers.headers).toEqual({
      [NODE_ADMIN_CLAIM_ID_HEADER]: 'nac_test_claim',
      [NODE_ADMIN_CLAIM_SECRET_HEADER]: 'nas_super_secret',
    })
  })

  it('binds claims to both node id and normalized management base URL', () => {
    const store = makeStore()

    store.register({
      nodeId: 'docker-node-1',
      managementBaseUrl: 'HTTP://127.0.0.1:8001/',
      claimId: 'nac_test_claim',
      rawSecret: 'nas_super_secret',
    })

    expect(store.getSummary('docker-node-1', 'http://127.0.0.1:8001').status).toBe('configured')
    expect(store.getSummary('docker-node-1', 'http://127.0.0.1:8002').status).toBe('missing')
    expect(store.getSummary('docker-node-2', 'http://127.0.0.1:8001').status).toBe('missing')
  })

  it('clears all claims for a removed node without affecting other nodes', () => {
    const store = makeStore()

    store.register({
      nodeId: 'docker-node-1',
      managementBaseUrl: 'http://127.0.0.1:8001',
      claimId: 'nac_claim_one',
      rawSecret: 'nas_secret_one',
    })
    store.register({
      nodeId: 'docker-node-2',
      managementBaseUrl: 'http://127.0.0.1:8002',
      claimId: 'nac_claim_two',
      rawSecret: 'nas_secret_two',
    })

    store.clear('docker-node-1')

    expect(store.getSummary('docker-node-1', 'http://127.0.0.1:8001').status).toBe('missing')
    expect(store.getSummary('docker-node-2', 'http://127.0.0.1:8002').status).toBe('configured')
  })

  it('persists the claim file with owner-only permissions where supported', () => {
    const store = makeStore()

    store.register({
      nodeId: 'docker-node-1',
      managementBaseUrl: 'http://127.0.0.1:8001',
      claimId: 'nac_test_claim',
      rawSecret: 'nas_super_secret',
    })

    const mode = fsSync.statSync(store.getFilePath()).mode & 0o777
    expect(mode).toBe(0o600)
  })
})
