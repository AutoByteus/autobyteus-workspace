import * as os from 'os'
import type { NodeEntry } from '../nodeRegistryTypes'
import type { NodeAccessActionResult, NodeAccessStates } from '../../shared/nodeAccessTypes'
import type { NodeCredentialAttacher } from './nodeCredentialAttacher'
import type { NodeCredentialStore } from './nodeCredentialStore'

const REQUEST_TIMEOUT_MS = 15_000

export type NodeAccessFetch = (url: string, init: {
  method: string
  headers: Record<string, string>
  body?: string
  signal?: AbortSignal
}) => Promise<Readonly<{ status: number; json: () => Promise<unknown> }>>

const trimBaseUrl = (baseUrl: string): string => baseUrl.trim().replace(/\/+$/, '')

/** The same embedded node under each loopback name a window may use. */
const loopbackAliases = (baseUrl: string): string[] => {
  try {
    const url = new URL(baseUrl)
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return [baseUrl]
    return ['127.0.0.1', 'localhost', '[::1]'].map((host) => `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`)
  } catch {
    return [baseUrl]
  }
}

const refusalOf = (answer: unknown, status: number): { code: string; message: string } => {
  const body = answer as { code?: unknown; message?: unknown } | null
  return {
    code: typeof body?.code === 'string' ? body.code : `HTTP_${status}`,
    message: typeof body?.message === 'string' ? body.message : `The node answered HTTP ${status}.`,
  }
}

/**
 * The desktop's connection to its nodes (node access model NA-5, NA-11; design DS-002, DS-003). The embedded node is
 * connected by its launch credential; a remote or Docker node by the owner credential it issued for a setup code. The
 * service exchanges setup codes, keeps the credentials (`NodeCredentialStore`), tells the attacher which origins get
 * which credential, revokes this desktop's credential on Disconnect and when a node is removed, and answers the
 * windows' states. No credential crosses to a window.
 */
export class NodeConnectService {
  constructor(private readonly dependencies: Readonly<{
    store: NodeCredentialStore
    attacher: NodeCredentialAttacher
    nodes(): readonly NodeEntry[]
    /** The embedded node's base URL and this run's launch credential (null until the node is started). */
    embedded(): Readonly<{ baseUrl: string; credential: string | null }>
    fetch?: NodeAccessFetch
    desktopName?: string
    onChange?(states: NodeAccessStates): void
  }>) {}

  /** The owner credential for a node base URL (the node update client's C1 requests from the main process). */
  credentialFor(baseUrl: string): string | null {
    const trimmed = trimBaseUrl(baseUrl)
    const embedded = this.dependencies.embedded()
    if (embedded.credential && loopbackAliases(trimBaseUrl(embedded.baseUrl)).includes(trimmed)) return embedded.credential
    const entry = this.dependencies.nodes().find((node) => node.nodeType === 'remote' && trimBaseUrl(node.baseUrl) === trimmed)
    return entry ? this.dependencies.store.get(entry.id)?.credential ?? null : null
  }

  states(): NodeAccessStates {
    const states: NodeAccessStates = {}
    for (const node of this.dependencies.nodes()) {
      states[node.id] = node.nodeType === 'embedded' || this.dependencies.store.get(node.id) ? 'connected' : 'needs_connecting'
    }
    return states
  }

  /** Re-reads the node list and credentials into the attacher (after start, a node list change, connect, disconnect). */
  refresh(): void {
    const embedded = this.dependencies.embedded()
    const entries: Array<{ baseUrl: string; credential: string }> = []
    if (embedded.credential) {
      for (const alias of loopbackAliases(trimBaseUrl(embedded.baseUrl))) entries.push({ baseUrl: alias, credential: embedded.credential })
    }
    for (const node of this.dependencies.nodes()) {
      const stored = node.nodeType === 'remote' ? this.dependencies.store.get(node.id) : null
      if (stored) entries.push({ baseUrl: node.baseUrl, credential: stored.credential })
    }
    this.dependencies.attacher.setCredentials(entries)
    this.dependencies.onChange?.(this.states())
  }

  /** Exchanges a setup code read on the node's computer for this desktop's owner credential (DS-003). */
  async connect(entryId: string, setupCode: string): Promise<NodeAccessActionResult> {
    const node = this.remoteNode(entryId)
    if (!node) return { ok: false, code: 'NODE_ENTRY_NOT_FOUND', message: 'This node is not in the node list.' }
    try {
      const response = await this.fetch(`${trimBaseUrl(node.baseUrl)}/rest/node-access/setup-exchanges`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ setupCode: setupCode.trim(), desktopName: this.dependencies.desktopName ?? os.hostname() }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const answer = await response.json().catch(() => null) as { credentialId?: unknown; credential?: unknown } | null
      if (response.status !== 201 || typeof answer?.credentialId !== 'string' || typeof answer.credential !== 'string') {
        return { ok: false, ...refusalOf(answer, response.status) }
      }
      this.dependencies.store.set(entryId, { credentialId: answer.credentialId, credential: answer.credential })
    } catch (error) {
      return { ok: false, code: 'NODE_UNREACHABLE', message: error instanceof Error ? error.message : String(error) }
    }
    this.refresh()
    return { ok: true, states: this.states() }
  }

  /**
   * Revokes this desktop's credential on the node (NA-11) and forgets it here. A node that cannot be reached keeps the
   * credential until its owner revokes it there; it is forgotten here either way.
   */
  async disconnect(entryId: string): Promise<NodeAccessActionResult> {
    const node = this.remoteNode(entryId)
    const stored = this.dependencies.store.get(entryId)
    if (!node || !stored) return { ok: true, states: this.states() }
    const revoked = await this.revoke(node.baseUrl, stored)
    this.dependencies.store.delete(entryId)
    this.refresh()
    return revoked ?? { ok: true, states: this.states() }
  }

  /** A node entry was removed from the list: its credential is revoked on the node and forgotten (REQ-011). */
  async nodeRemoved(entryId: string, baseUrl: string): Promise<void> {
    const stored = this.dependencies.store.get(entryId)
    if (!stored) return
    await this.revoke(baseUrl, stored)
    this.dependencies.store.delete(entryId)
    this.refresh()
  }

  private async revoke(baseUrl: string, stored: Readonly<{ credentialId: string; credential: string }>): Promise<NodeAccessActionResult | null> {
    try {
      const response = await this.fetch(`${trimBaseUrl(baseUrl)}/rest/node-access/owner-credentials/${encodeURIComponent(stored.credentialId)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${stored.credential}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (response.status === 204 || response.status === 404 || response.status === 401) return null
      return { ok: false, ...refusalOf(await response.json().catch(() => null), response.status) }
    } catch (error) {
      return { ok: false, code: 'NODE_UNREACHABLE', message: error instanceof Error ? error.message : String(error) }
    }
  }

  private remoteNode(entryId: string): NodeEntry | null {
    return this.dependencies.nodes().find((node) => node.id === entryId && node.nodeType === 'remote') ?? null
  }

  private fetch(url: string, init: Parameters<NodeAccessFetch>[1]) {
    return (this.dependencies.fetch ?? ((target, options) => fetch(target, options)))(url, init)
  }
}
