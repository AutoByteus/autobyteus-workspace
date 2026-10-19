/** Reconnect delays: 1 s, 2 s, 4 s, … capped at 10 s. */
export const nodeChangeRetryDelayMs = (attempt: number): number => Math.min(10_000, 1000 * 2 ** Math.min(attempt, 4))

export type NodeChangeSocket = Pick<WebSocket, 'close'> & {
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
}

export type NodeChangeFeedOptions<TMessage extends { type: string }> = Readonly<{
  /** Names the feed in warnings. */
  label: string
  endpoint(): string | null
  parse(raw: string): TMessage | null
  deliver(message: TMessage): void
  createSocket?(url: string): NodeChangeSocket
  retryDelayMs?(attempt: number): number
}>

/**
 * One node change feed socket (server → client JSON frames). The socket is open while at least
 * one caller retains the feed, reconnects with backoff, and is reopened for a newly bound node.
 * A `connected` frame resets the backoff; consumers re-read what they have loaded on it.
 */
export class NodeChangeFeed<TMessage extends { type: string }> {
  private socket: NodeChangeSocket | null = null
  private retainers = 0
  private attempts = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: NodeChangeFeedOptions<TMessage>) {}

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
    const socket = (this.options.createSocket ?? ((value: string) => new WebSocket(value) as unknown as NodeChangeSocket))(url)
    this.socket = socket
    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      const message = this.options.parse(String(event.data))
      if (!message) { console.warn(`Ignored an unrecognized ${this.options.label} change frame.`); return }
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
    const delay = (this.options.retryDelayMs ?? nodeChangeRetryDelayMs)(this.attempts++)
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
