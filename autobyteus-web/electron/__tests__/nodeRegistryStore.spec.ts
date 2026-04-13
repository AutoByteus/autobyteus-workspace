import * as fsSync from 'fs'
import * as os from 'os'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { ensureEmbeddedNode, loadNodeRegistrySnapshot, updateNodeBrowserPairing } from '../nodeRegistryStore'
import { EMBEDDED_NODE_ID, type NodeRegistrySnapshot } from '../nodeRegistryTypes'
import { INTERNAL_SERVER_BASE_URL } from '../../shared/embeddedServerConfig'

describe('nodeRegistryStore', () => {
  it('adds the embedded node with the canonical loopback base URL when missing', () => {
    const snapshot: NodeRegistrySnapshot = {
      version: 2,
      nodes: [
        {
          id: 'remote-1',
          name: 'Remote Node',
          baseUrl: 'http://localhost:8000',
          nodeType: 'remote',
          isSystem: false,
          createdAt: '2026-03-31T09:00:00.000Z',
          updatedAt: '2026-03-31T09:00:00.000Z',
        },
      ],
    }

    const nextSnapshot = ensureEmbeddedNode(snapshot)

    expect(nextSnapshot.version).toBe(3)
    expect(nextSnapshot.nodes[0]?.id).toBe(EMBEDDED_NODE_ID)
    expect(nextSnapshot.nodes[0]?.baseUrl).toBe(INTERNAL_SERVER_BASE_URL)
  })

  it('rewrites stale embedded node base URLs to the canonical loopback value', () => {
    const snapshot: NodeRegistrySnapshot = {
      version: 7,
      nodes: [
        {
          id: EMBEDDED_NODE_ID,
          name: 'Embedded Node',
          baseUrl: 'http://192.168.1.8:29695',
          nodeType: 'embedded',
          isSystem: true,
          createdAt: '2026-03-31T09:00:00.000Z',
          updatedAt: '2026-03-31T09:00:00.000Z',
        },
      ],
    }

    const nextSnapshot = ensureEmbeddedNode(snapshot)

    expect(nextSnapshot.version).toBe(8)
    expect(nextSnapshot.nodes[0]?.baseUrl).toBe(INTERNAL_SERVER_BASE_URL)
    expect(nextSnapshot.nodes[0]?.updatedAt).not.toBe(snapshot.nodes[0]?.updatedAt)
  })

  it('leaves the snapshot unchanged when the embedded base URL is already canonical', () => {
    const snapshot: NodeRegistrySnapshot = {
      version: 4,
      nodes: [
        {
          id: EMBEDDED_NODE_ID,
          name: 'Embedded Node',
          baseUrl: INTERNAL_SERVER_BASE_URL,
          nodeType: 'embedded',
          isSystem: true,
          createdAt: '2026-03-31T09:00:00.000Z',
          updatedAt: '2026-03-31T09:00:00.000Z',
        },
      ],
    }

    expect(ensureEmbeddedNode(snapshot)).toBe(snapshot)
  })

  it('normalizes persisted paired browser state to expired after Electron restart', () => {
    const userDataPath = fsSync.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-node-registry-'))
    fsSync.writeFileSync(
      path.join(userDataPath, 'node-registry.v1.json'),
      JSON.stringify(loadSnapshotWithBrowserPairing('paired'), null, 2),
      'utf8',
    )

    const nextSnapshot = loadNodeRegistrySnapshot(userDataPath)

    expect(nextSnapshot.nodes[1]?.browserPairing?.state).toBe('expired')
    expect(nextSnapshot.nodes[1]?.browserPairing?.errorMessage).toBe('Pairing expired after Electron restart.')
  })

  it('updates browser pairing state for a remote node and bumps the snapshot version', () => {
    const snapshot = loadSnapshotWithBrowserPairing(undefined)

    const nextSnapshot = updateNodeBrowserPairing(snapshot, 'remote-1', {
      state: 'paired',
      advertisedBaseUrl: 'http://192.168.1.24:30123',
      expiresAt: '2026-04-10T10:20:30.000Z',
      updatedAt: '2026-04-10T09:20:30.000Z',
      errorMessage: null,
    })

    expect(nextSnapshot.version).toBe(snapshot.version + 1)
    expect(nextSnapshot.nodes[0]?.id).toBe(EMBEDDED_NODE_ID)
    expect(nextSnapshot.nodes[1]?.browserPairing?.state).toBe('paired')
    expect(nextSnapshot.nodes[1]?.browserPairing?.advertisedBaseUrl).toBe('http://192.168.1.24:30123')
  })
})

function loadSnapshotWithBrowserPairing(
  state: 'paired' | undefined,
): NodeRegistrySnapshot {
  return {
    version: 2,
    nodes: [
      {
        id: EMBEDDED_NODE_ID,
        name: 'Embedded Node',
        baseUrl: INTERNAL_SERVER_BASE_URL,
        nodeType: 'embedded',
        isSystem: true,
        createdAt: '2026-03-31T09:00:00.000Z',
        updatedAt: '2026-03-31T09:00:00.000Z',
      },
      {
        id: 'remote-1',
        name: 'Remote Node',
        baseUrl: 'http://localhost:8000',
        nodeType: 'remote',
        isSystem: false,
        createdAt: '2026-03-31T09:00:00.000Z',
        updatedAt: '2026-03-31T09:00:00.000Z',
        browserPairing: state
          ? {
              state,
              advertisedBaseUrl: 'http://192.168.1.24:30123',
              expiresAt: '2026-04-10T10:20:30.000Z',
              updatedAt: '2026-04-10T09:20:30.000Z',
              errorMessage: null,
            }
          : undefined,
      },
    ],
  }
}
