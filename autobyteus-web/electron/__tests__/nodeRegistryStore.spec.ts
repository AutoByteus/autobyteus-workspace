import * as fsSync from 'fs'
import * as os from 'os'
import * as path from 'path'
import { describe, expect, it, vi } from 'vitest'
import { ensureEmbeddedNode, identifyNodeEntry, loadNodeRegistrySnapshot, saveNodeRegistrySnapshot } from '../nodeRegistryStore'
import { EMBEDDED_NODE_ID, type NodeRegistrySnapshot } from '../nodeRegistryTypes'
import { PRODUCTION_EMBEDDED_SERVER_BASE_URL } from '../../shared/embeddedServerClientEndpoint'

vi.mock('../logger', () => {
  const logger = {
    child: vi.fn(() => logger),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
  return { logger }
})

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

    const nextSnapshot = ensureEmbeddedNode(snapshot, PRODUCTION_EMBEDDED_SERVER_BASE_URL)

    expect(nextSnapshot.version).toBe(3)
    expect(nextSnapshot.nodes[0]?.id).toBe(EMBEDDED_NODE_ID)
    expect(nextSnapshot.nodes[0]?.baseUrl).toBe(PRODUCTION_EMBEDDED_SERVER_BASE_URL)
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

    const nextSnapshot = ensureEmbeddedNode(snapshot, PRODUCTION_EMBEDDED_SERVER_BASE_URL)

    expect(nextSnapshot.version).toBe(8)
    expect(nextSnapshot.nodes[0]?.baseUrl).toBe(PRODUCTION_EMBEDDED_SERVER_BASE_URL)
    expect(nextSnapshot.nodes[0]?.updatedAt).not.toBe(snapshot.nodes[0]?.updatedAt)
  })

  it('leaves the snapshot unchanged when the embedded base URL is already canonical', () => {
    const snapshot: NodeRegistrySnapshot = {
      version: 4,
      nodes: [
        {
          id: EMBEDDED_NODE_ID,
          name: 'Embedded Node',
          baseUrl: PRODUCTION_EMBEDDED_SERVER_BASE_URL,
          nodeType: 'embedded',
          isSystem: true,
          createdAt: '2026-03-31T09:00:00.000Z',
          updatedAt: '2026-03-31T09:00:00.000Z',
        },
      ],
    }

    expect(ensureEmbeddedNode(snapshot, PRODUCTION_EMBEDDED_SERVER_BASE_URL)).toBe(snapshot)
  })

  it('drops legacy persisted browser pairing state while loading nodes', () => {
    const userDataPath = fsSync.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-node-registry-'))
    fsSync.writeFileSync(
      path.join(userDataPath, 'node-registry.v1.json'),
      JSON.stringify(loadSnapshotWithLegacyBrowserPairing(), null, 2),
      'utf8',
    )

    const nextSnapshot = loadNodeRegistrySnapshot(userDataPath, PRODUCTION_EMBEDDED_SERVER_BASE_URL)

    expect(nextSnapshot.nodes[1]?.id).toBe('remote-1')
    expect(nextSnapshot.nodes[1]).not.toHaveProperty('browserPairing')
  })

  // one-nodes-tab, design § Persisted Data: `Directly Usable — No Migration`.
  it('loads an entry written before one-nodes-tab without its probe fields, and the next save no longer has them', () => {
    const userDataPath = fsSync.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-node-registry-'))
    const file = path.join(userDataPath, 'node-registry.v1.json')
    fsSync.writeFileSync(file, JSON.stringify({ version: 5, nodes: [
      { id: EMBEDDED_NODE_ID, name: 'Embedded Node', baseUrl: PRODUCTION_EMBEDDED_SERVER_BASE_URL, nodeType: 'embedded',
        capabilities: { terminal: true, fileExplorerStreaming: true }, capabilityProbeState: 'ready', isSystem: true,
        createdAt: '2026-03-31T09:00:00.000Z', updatedAt: '2026-03-31T09:00:00.000Z' },
      { id: 'remote-ba22', name: 'http://localhost:8001', baseUrl: 'http://localhost:8001', nodeType: 'remote',
        capabilities: { terminal: true, fileExplorerStreaming: true }, capabilityProbeState: 'ready', isSystem: false,
        createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-01T09:00:00.000Z' },
    ] }), 'utf8')

    const loaded = loadNodeRegistrySnapshot(userDataPath, PRODUCTION_EMBEDDED_SERVER_BASE_URL)

    expect(loaded.version).toBe(5)
    expect(loaded.nodes).toEqual([
      { id: EMBEDDED_NODE_ID, name: 'Embedded Node', baseUrl: PRODUCTION_EMBEDDED_SERVER_BASE_URL, nodeType: 'embedded', isSystem: true,
        createdAt: '2026-03-31T09:00:00.000Z', updatedAt: '2026-03-31T09:00:00.000Z' },
      { id: 'remote-ba22', name: 'http://localhost:8001', baseUrl: 'http://localhost:8001', nodeType: 'remote', isSystem: false,
        createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-01T09:00:00.000Z' },
    ])
    saveNodeRegistrySnapshot(userDataPath, loaded)
    expect(fsSync.readFileSync(file, 'utf8')).not.toMatch(/capabilit/)
  })

  it('reads a valid serverInstanceId and treats an invalid one as not learned yet', () => {
    const userDataPath = fsSync.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-node-registry-'))
    const remote = (id: string, serverInstanceId: unknown) => ({ id, name: id, baseUrl: `http://${id}:8000`, nodeType: 'remote', serverInstanceId,
      isSystem: false, createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-01T09:00:00.000Z' })
    fsSync.writeFileSync(path.join(userDataPath, 'node-registry.v1.json'), JSON.stringify({ version: 1, nodes: [
      remote('a', SRV_A), remote('b', 'srv_short'), remote('c', 42), remote('d', 'not-an-id'),
    ] }), 'utf8')

    const loaded = loadNodeRegistrySnapshot(userDataPath, PRODUCTION_EMBEDDED_SERVER_BASE_URL)

    expect(loaded.nodes.map((node) => [node.id, node.serverInstanceId])).toEqual([
      [EMBEDDED_NODE_ID, undefined], ['a', SRV_A], ['b', undefined], ['c', undefined], ['d', undefined]])
    expect(loaded.nodes[2]).not.toHaveProperty('serverInstanceId')
  })

  it('identify sets or replaces the ID of the named entry only, is the same array when equal, and refuses bad input', () => {
    const nodes = loadSnapshotWithLegacyBrowserPairing().nodes.map(({ browserPairing: _ignored, ...node }: any) => node)
    const set = identifyNodeEntry(nodes, { type: 'identify', nodeId: 'remote-1', serverInstanceId: SRV_A }, '2026-10-23T08:00:00.000Z')
    expect(set[1]).toMatchObject({ id: 'remote-1', name: 'Remote Node', baseUrl: 'http://localhost:8000', serverInstanceId: SRV_A,
      updatedAt: '2026-10-23T08:00:00.000Z' })
    expect(set[0]).toBe(nodes[0])
    expect(nodes[1]).not.toHaveProperty('serverInstanceId')
    // The address now answers with another ID (a Docker node recreated with a fresh volume): it replaces the stored one.
    const replaced = identifyNodeEntry(set, { type: 'identify', nodeId: 'remote-1', serverInstanceId: SRV_B }, '2026-10-23T09:00:00.000Z')
    expect(replaced[1]?.serverInstanceId).toBe(SRV_B)
    expect(identifyNodeEntry(replaced, { type: 'identify', nodeId: 'remote-1', serverInstanceId: SRV_B }, 'later')).toBe(replaced)
    expect(() => identifyNodeEntry(nodes, { type: 'identify', nodeId: 'missing', serverInstanceId: SRV_A }, 'now')).toThrow('Node does not exist')
    expect(() => identifyNodeEntry(nodes, { type: 'identify', nodeId: 'remote-1', serverInstanceId: 'srv_x' }, 'now')).toThrow('Invalid server instance ID')
  })
})

const SRV_A = 'srv_ibJioK7nAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const SRV_B = 'srv_freshVolumeBBBBBBBBBBBBBBBBBBBBBBBBB'

function loadSnapshotWithLegacyBrowserPairing(): NodeRegistrySnapshot {
  return {
    version: 2,
    nodes: [
      {
        id: EMBEDDED_NODE_ID,
        name: 'Embedded Node',
        baseUrl: PRODUCTION_EMBEDDED_SERVER_BASE_URL,
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
        browserPairing: {
          state: 'paired',
          advertisedBaseUrl: 'http://192.168.1.24:30123',
          expiresAt: '2026-04-10T10:20:30.000Z',
          updatedAt: '2026-04-10T09:20:30.000Z',
          errorMessage: null,
        },
      } as any,
    ],
  }
}
