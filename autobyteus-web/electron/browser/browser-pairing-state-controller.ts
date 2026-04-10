import type {
  NodeBrowserPairingState,
  NodeBrowserPairingStatus,
  NodeProfile,
  NodeRegistrySnapshot,
  RemoteBrowserBridgeDescriptor,
  RemoteBrowserSharingSettings,
  RemoteBrowserSharingSettingsResult,
} from '../nodeRegistryTypes'
import { updateNodeBrowserPairing } from '../nodeRegistryStore'
import { BrowserBridgeAuthRegistry } from './browser-bridge-auth-registry'
import { RemoteBrowserSharingSettingsStore } from './remote-browser-sharing-settings-store'

export const DEFAULT_REMOTE_BROWSER_PAIRING_TTL_MS = 15 * 60 * 1000

type BrowserPairingStateControllerOptions = {
  settingsStore: RemoteBrowserSharingSettingsStore
  authRegistry: BrowserBridgeAuthRegistry
  isRemoteSharingActive: () => boolean
  getRemoteBridgeBaseUrl: (advertisedHost: string) => string
  getNodeRegistrySnapshot: () => NodeRegistrySnapshot
  commitNodeRegistrySnapshot: (snapshot: NodeRegistrySnapshot) => void
  pairingTtlMs?: number
}

function nowIsoString(): string {
  return new Date().toISOString()
}

export class BrowserPairingStateController {
  private readonly pairingTtlMs: number
  private readonly expiryTimers = new Map<string, NodeJS.Timeout>()

  constructor(private readonly options: BrowserPairingStateControllerOptions) {
    this.pairingTtlMs = options.pairingTtlMs ?? DEFAULT_REMOTE_BROWSER_PAIRING_TTL_MS
  }

  getSettings(): RemoteBrowserSharingSettings {
    return this.options.settingsStore.getSnapshot()
  }

  updateSettings(nextSettings: RemoteBrowserSharingSettings): RemoteBrowserSharingSettingsResult {
    const previous = this.options.settingsStore.getSnapshot()
    const settings = this.options.settingsStore.save(nextSettings)
    return {
      settings,
      requiresRestart: previous.enabled !== settings.enabled,
    }
  }

  issueRemoteBrowserBridgeDescriptor(nodeId: string): RemoteBrowserBridgeDescriptor {
    const node = this.requireRemoteNode(nodeId)
    const settings = this.options.settingsStore.getSnapshot()
    if (!settings.enabled) {
      throw new Error('Remote browser sharing is disabled in settings.')
    }
    if (!this.options.isRemoteSharingActive()) {
      throw new Error('Remote browser sharing requires an app restart before pairing can begin.')
    }

    const expiresAt = new Date(Date.now() + this.pairingTtlMs).toISOString()
    const descriptor = this.options.authRegistry.issueRemoteNodeBinding({
      nodeId,
      baseUrl: this.options.getRemoteBridgeBaseUrl(settings.advertisedHost),
      expiresAt,
    })

    this.scheduleExpiry(nodeId, expiresAt)
    this.commitPairingState(node, {
      state: 'pairing',
      advertisedBaseUrl: descriptor.baseUrl,
      expiresAt,
      updatedAt: nowIsoString(),
      errorMessage: null,
    })

    return descriptor
  }

  confirmRemoteBrowserBridgeRegistration(nodeId: string): void {
    const node = this.requireRemoteNode(nodeId)
    const existing = node.browserPairing
    if (!existing || existing.state !== 'pairing') {
      throw new Error(`No pending browser pairing exists for node ${nodeId}.`)
    }
    if (existing.expiresAt && Date.parse(existing.expiresAt) <= Date.now()) {
      this.revokeRemoteBrowserBridgeDescriptor(nodeId, 'expired', 'Pairing expired before confirmation.')
      throw new Error(`Pending browser pairing expired before confirmation for node ${nodeId}.`)
    }

    this.commitPairingState(node, {
      ...existing,
      state: 'paired',
      updatedAt: nowIsoString(),
      errorMessage: null,
    })
  }

  revokeRemoteBrowserBridgeDescriptor(
    nodeId: string,
    state: Extract<NodeBrowserPairingState, 'revoked' | 'expired' | 'rejected'>,
    errorMessage: string | null = null,
  ): void {
    this.cleanupRemoteBinding(nodeId)

    const node = this.findRemoteNode(nodeId)
    if (!node) {
      return
    }
    const existing = node.browserPairing
    this.commitPairingState(node, {
      state,
      advertisedBaseUrl: existing?.advertisedBaseUrl ?? null,
      expiresAt: existing?.expiresAt ?? null,
      updatedAt: nowIsoString(),
      errorMessage,
    })
  }

  handleNodeRemoval(nodeId: string): void {
    this.cleanupRemoteBinding(nodeId)
  }

  stop(): void {
    for (const timer of this.expiryTimers.values()) {
      clearTimeout(timer)
    }
    this.expiryTimers.clear()
  }

  private requireRemoteNode(nodeId: string): NodeProfile {
    const node = this.findRemoteNode(nodeId)
    if (!node) {
      const existingNode = this.options.getNodeRegistrySnapshot().nodes.find((candidate) => candidate.id === nodeId)
      if (!existingNode) {
        throw new Error(`Node does not exist: ${nodeId}`)
      }
      throw new Error('Browser pairing is supported only for remote nodes.')
    }
    return node
  }

  private findRemoteNode(nodeId: string): NodeProfile | null {
    const node = this.options.getNodeRegistrySnapshot().nodes.find((candidate) => candidate.id === nodeId)
    if (!node || node.nodeType !== 'remote') {
      return null
    }
    return node
  }

  private commitPairingState(node: NodeProfile, pairing: NodeBrowserPairingStatus): void {
    const snapshot = this.options.getNodeRegistrySnapshot()
    const nextSnapshot = updateNodeBrowserPairing(snapshot, node.id, pairing)
    this.options.commitNodeRegistrySnapshot(nextSnapshot)
  }

  private scheduleExpiry(nodeId: string, expiresAt: string): void {
    this.cancelExpiry(nodeId)
    const delayMs = Math.max(0, Date.parse(expiresAt) - Date.now())
    const timer = setTimeout(() => {
      this.revokeRemoteBrowserBridgeDescriptor(nodeId, 'expired')
    }, delayMs)
    this.expiryTimers.set(nodeId, timer)
  }

  private cancelExpiry(nodeId: string): void {
    const existing = this.expiryTimers.get(nodeId)
    if (!existing) {
      return
    }
    clearTimeout(existing)
    this.expiryTimers.delete(nodeId)
  }

  private cleanupRemoteBinding(nodeId: string): void {
    this.cancelExpiry(nodeId)
    this.options.authRegistry.revokeRemoteNodeBinding(nodeId)
  }
}
