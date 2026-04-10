import type { IncomingHttpHeaders } from 'http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NodeRegistrySnapshot } from '../../nodeRegistryTypes'
import { BrowserBridgeAuthRegistry } from '../browser-bridge-auth-registry'
import { BrowserPairingStateController } from '../browser-pairing-state-controller'
import { RemoteBrowserSharingSettingsStore } from '../remote-browser-sharing-settings-store'

describe('BrowserPairingStateController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('issues a descriptor, confirms pairing, and expires the local node state on schedule', () => {
    let snapshot: NodeRegistrySnapshot = {
      version: 1,
      nodes: [
        {
          id: 'embedded-local',
          name: 'Embedded Node',
          baseUrl: 'http://127.0.0.1:29695',
          nodeType: 'embedded',
          isSystem: true,
          createdAt: '2026-04-10T09:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
        },
        {
          id: 'remote-1',
          name: 'Remote Node',
          baseUrl: 'http://node-a:8000',
          nodeType: 'remote',
          isSystem: false,
          createdAt: '2026-04-10T09:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
        },
      ],
    }

    const settingsStore = {
      getSnapshot: () => ({
        enabled: true,
        advertisedHost: 'host.docker.internal',
      }),
      save: vi.fn(),
    } as unknown as RemoteBrowserSharingSettingsStore

    const authRegistry = new BrowserBridgeAuthRegistry()
    const controller = new BrowserPairingStateController({
      settingsStore,
      authRegistry,
      isRemoteSharingActive: () => true,
      getRemoteBridgeBaseUrl: (advertisedHost) => `http://${advertisedHost}:30123`,
      getNodeRegistrySnapshot: () => snapshot,
      commitNodeRegistrySnapshot: (nextSnapshot) => {
        snapshot = nextSnapshot
      },
      pairingTtlMs: 5_000,
    })

    const descriptor = controller.issueRemoteBrowserBridgeDescriptor('remote-1')
    expect(descriptor.baseUrl).toBe('http://host.docker.internal:30123')
    expect(snapshot.nodes[1]?.browserPairing?.state).toBe('pairing')

    controller.confirmRemoteBrowserBridgeRegistration('remote-1')
    expect(snapshot.nodes[1]?.browserPairing?.state).toBe('paired')

    vi.advanceTimersByTime(5_001)

    expect(snapshot.nodes[1]?.browserPairing?.state).toBe('expired')
    expect(snapshot.nodes[1]?.browserPairing?.expiresAt).toBe(descriptor.expiresAt)
  })

  it('rejects descriptor issuance when remote browser sharing is disabled', () => {
    let snapshot: NodeRegistrySnapshot = {
      version: 1,
      nodes: [
        {
          id: 'remote-1',
          name: 'Remote Node',
          baseUrl: 'http://node-a:8000',
          nodeType: 'remote',
          isSystem: false,
          createdAt: '2026-04-10T09:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
        },
      ],
    }

    const settingsStore = {
      getSnapshot: () => ({
        enabled: false,
        advertisedHost: '',
      }),
      save: vi.fn(),
    } as unknown as RemoteBrowserSharingSettingsStore

    const controller = new BrowserPairingStateController({
      settingsStore,
      authRegistry: new BrowserBridgeAuthRegistry(),
      isRemoteSharingActive: () => false,
      getRemoteBridgeBaseUrl: () => 'http://host.docker.internal:30123',
      getNodeRegistrySnapshot: () => snapshot,
      commitNodeRegistrySnapshot: (nextSnapshot) => {
        snapshot = nextSnapshot
      },
      pairingTtlMs: 5_000,
    })

    expect(() => controller.issueRemoteBrowserBridgeDescriptor('remote-1')).toThrow(
      'Remote browser sharing is disabled in settings.',
    )
    expect(snapshot.nodes[0]?.browserPairing).toBeUndefined()
  })

  it('revokes token state and cancels expiry when a paired node is removed', () => {
    let snapshot: NodeRegistrySnapshot = {
      version: 1,
      nodes: [
        {
          id: 'remote-1',
          name: 'Remote Node',
          baseUrl: 'http://node-a:8000',
          nodeType: 'remote',
          isSystem: false,
          createdAt: '2026-04-10T09:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
        },
      ],
    }

    const settingsStore = {
      getSnapshot: () => ({
        enabled: true,
        advertisedHost: 'host.docker.internal',
      }),
      save: vi.fn(),
    } as unknown as RemoteBrowserSharingSettingsStore

    const authRegistry = new BrowserBridgeAuthRegistry()
    const controller = new BrowserPairingStateController({
      settingsStore,
      authRegistry,
      isRemoteSharingActive: () => true,
      getRemoteBridgeBaseUrl: (advertisedHost) => `http://${advertisedHost}:30123`,
      getNodeRegistrySnapshot: () => snapshot,
      commitNodeRegistrySnapshot: (nextSnapshot) => {
        snapshot = nextSnapshot
      },
      pairingTtlMs: 5_000,
    })

    const descriptor = controller.issueRemoteBrowserBridgeDescriptor('remote-1')
    controller.confirmRemoteBrowserBridgeRegistration('remote-1')
    controller.handleNodeRemoval('remote-1')
    snapshot = {
      ...snapshot,
      version: snapshot.version + 1,
      nodes: [],
    }

    vi.advanceTimersByTime(5_001)

    expect(isAuthorized(authRegistry, descriptor.authToken)).toBe(false)
  })
})

function isAuthorized(authRegistry: BrowserBridgeAuthRegistry, token: string): boolean {
  const headers: IncomingHttpHeaders = {
    'x-autobyteus-browser-token': token,
  }
  return authRegistry.isAuthorized(headers)
}
