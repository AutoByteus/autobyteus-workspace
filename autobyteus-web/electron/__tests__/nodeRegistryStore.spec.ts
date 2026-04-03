import { describe, expect, it } from 'vitest'
import { ensureEmbeddedNode } from '../nodeRegistryStore'
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
})
