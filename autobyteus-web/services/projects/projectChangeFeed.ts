import { watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import type { ProjectChangeMessage } from '~/types/project'

const MESSAGE_TYPES = new Set(['connected', 'project_upserted', 'project_removed', 'task_upserted', 'task_removed', 'task_worker_status'])
/** Reconnect delays: 1 s, 2 s, 4 s, … capped at 10 s. */
export const projectChangeRetryDelayMs = (attempt: number): number => Math.min(10_000, 1000 * 2 ** Math.min(attempt, 4))

export const parseProjectChangeMessage = (raw: string): ProjectChangeMessage | null => {
  try {
    const value = JSON.parse(raw) as { type?: unknown }
    return value && typeof value === 'object' && typeof value.type === 'string' && MESSAGE_TYPES.has(value.type) ? value as ProjectChangeMessage : null
  } catch { return null }
}

type SocketLike = Pick<WebSocket, 'close'> & {
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
}

/**
 * The window node's `/ws/projects` change feed. Projects pages retain it while they are mounted;
 * the socket is open while at least one retains it, reconnects with backoff, and is reopened for a
 * newly bound node. Every `connected` frame makes the stores re-read what they have loaded.
 */
export class ProjectChangeFeed {
  private socket: SocketLike | null = null
  private retainers = 0
  private attempts = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: Readonly<{
    endpoint(): string | null
    deliver(message: ProjectChangeMessage): void
    createSocket?(url: string): SocketLike
    retryDelayMs?(attempt: number): number
  }>) {}

  /** Keeps the feed open until the returned release is called. */
  retain(): () => void {
    this.retainers++
    this.connect()
    let released = false
    return () => {
      if (released) return
      released = true
      this.retainers--
      if (this.retainers === 0) this.close()
    }
  }

  /** The window was bound to another node: reconnect there if retained. */
  rebind(): void {
    this.close()
    this.attempts = 0
    this.connect()
  }

  isOpen(): boolean { return this.socket !== null }

  private connect(): void {
    if (this.socket || this.retainers === 0 || this.retryTimer) return
    const url = this.options.endpoint()
    if (!url) return
    const socket = (this.options.createSocket ?? ((value: string) => new WebSocket(value) as unknown as SocketLike))(url)
    this.socket = socket
    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      const message = parseProjectChangeMessage(String(event.data))
      if (!message) { console.warn('Ignored an unrecognized Projects change frame.'); return }
      if (message.type === 'connected') this.attempts = 0
      this.options.deliver(message)
    }
    socket.onerror = () => undefined
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      if (this.retainers > 0) this.scheduleRetry()
    }
  }

  private scheduleRetry(): void {
    const delay = (this.options.retryDelayMs ?? projectChangeRetryDelayMs)(this.attempts++)
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connect() }, delay)
  }

  private close(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
    const socket = this.socket
    this.socket = null
    if (socket) { socket.onclose = null; socket.onmessage = null; try { socket.close() } catch { /* already closed */ } }
  }
}

let feed: ProjectChangeFeed | null = null
/** The process feed, delivering to the Project and Task stores of the bound node. */
export const getProjectChangeFeed = (): ProjectChangeFeed => {
  if (feed) return feed
  const node = useWindowNodeContextStore()
  const created = new ProjectChangeFeed({
    endpoint: () => {
      try { return buildAuthenticatedWebSocketUrl(node.getBoundEndpoints().projectsWs, getActiveRemoteAccessCredential() ?? '') }
      catch { return null }
    },
    deliver: (message) => {
      useProjectStore().applyChange(message)
      useProjectTaskStore().applyChange(message)
    },
  })
  watch(() => node.bindingRevision, () => created.rebind())
  feed = created
  return created
}
export const resetProjectChangeFeedForTests = (): void => { feed = null }
