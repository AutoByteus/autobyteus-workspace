import {
  parseRunStatusServerMessage,
  serializeRunStatusMessage,
  type RunStatusRunRef,
  type RunStatusServerMessage,
} from '@autobyteus/collaboration-stream-contracts'
import { nodeChangeRetryDelayMs } from '~/services/nodeChangeFeed/nodeChangeFeed'

export type RunStatusSocket = Readonly<{ send(data: string): void; close(): void }> & {
  onopen: (() => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
}

const keyOf = (ref: RunStatusRunRef): string => `${ref.kind}:${ref.runId}`

/**
 * The window's one `/ws/run-status` connection (autobyteus-461 SR-082, SR-083): it is open while any run is held, holds
 * each run by count, subscribes a newly held run and unsubscribes one no longer held, and subscribes every held run again
 * on each (re)connect, whose snapshot replaces the answers it had.
 */
export class RunStatusFeed {
  private socket: RunStatusSocket | null = null
  private open = false
  private readonly held = new Map<string, { ref: RunStatusRunRef; count: number }>()
  private attempts = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: Readonly<{
    endpoint(): string | null
    deliver(message: RunStatusServerMessage): void
    createSocket?(url: string): RunStatusSocket
    retryDelayMs?(attempt: number): number
  }>) {}

  /** Follows these runs until the returned release is called. */
  hold(refs: readonly RunStatusRunRef[]): () => void {
    const added: RunStatusRunRef[] = []
    for (const ref of refs) {
      const entry = this.held.get(keyOf(ref))
      if (entry) entry.count += 1
      else { this.held.set(keyOf(ref), { ref, count: 1 }); added.push(ref) }
    }
    if (this.socket) { if (added.length) this.send('SUBSCRIBE', added) } else this.connect()
    let released = false
    return () => {
      if (released) return
      released = true
      const removed: RunStatusRunRef[] = []
      for (const ref of refs) {
        const entry = this.held.get(keyOf(ref))
        if (!entry || --entry.count > 0) continue
        this.held.delete(keyOf(ref))
        removed.push(ref)
      }
      if (removed.length) this.send('UNSUBSCRIBE', removed)
      if (this.held.size === 0) this.close()
    }
  }

  /** The window was bound to another node: reconnect there. */
  rebind(): void {
    this.close()
    this.attempts = 0
    this.connect()
  }

  private send(type: 'SUBSCRIBE' | 'UNSUBSCRIBE', runs: readonly RunStatusRunRef[]): void {
    if (!this.socket || !this.open) return
    try { this.socket.send(serializeRunStatusMessage({ type, payload: { runs: [...runs] } })) } catch { /* the close reconnects */ }
  }

  private connect(): void {
    if (this.socket || this.held.size === 0 || this.retryTimer) return
    const url = this.options.endpoint()
    if (!url) return
    const socket = (this.options.createSocket ?? ((value: string) => new WebSocket(value) as unknown as RunStatusSocket))(url)
    this.socket = socket
    this.open = false
    socket.onopen = () => {
      if (this.socket !== socket) return
      this.open = true
      this.attempts = 0
      this.send('SUBSCRIBE', [...this.held.values()].map((entry) => entry.ref))
    }
    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      let message: RunStatusServerMessage
      try { message = parseRunStatusServerMessage(JSON.parse(String(event.data))) } catch { console.warn('Ignored an unrecognized run status frame.'); return }
      this.options.deliver(message)
    }
    socket.onerror = () => undefined
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      this.open = false
      if (this.held.size > 0) this.scheduleRetry()
    }
  }

  private scheduleRetry(): void {
    const delay = (this.options.retryDelayMs ?? nodeChangeRetryDelayMs)(this.attempts++)
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connect() }, delay)
  }

  private close(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
    const socket = this.socket
    this.socket = null
    this.open = false
    if (socket) { socket.onclose = null; socket.onmessage = null; socket.onopen = null; try { socket.close() } catch { /* already closed */ } }
  }
}
