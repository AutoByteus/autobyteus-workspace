import {
  parseRunStatusServerMessage,
  serializeRunStatusMessage,
  type RunStatusRunRef,
  type RunStatusServerMessage,
} from '@autobyteus/collaboration-stream-contracts'
import { isCredentialRefusalClose } from '~/services/liveStreamLifecycle/credentialRefusalClose'
import { LiveStreamReconnectScheduler } from '~/services/liveStreamLifecycle/liveStreamReconnectScheduler'
import { isPageVisible, subscribePageResume } from '~/services/liveStreamLifecycle/pageResumeSignal'

export type RunStatusSocket = Readonly<{ send(data: string): void; close(): void }> & {
  onopen: (() => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event?: Readonly<{ code?: number; reason?: string }>) => void) | null
  onerror: (() => void) | null
}

const keyOf = (ref: Pick<RunStatusRunRef, 'kind' | 'runId'>): string => `${ref.kind}:${ref.runId}`

/**
 * The window's one `/ws/run-status` connection (autobyteus-461 SR-082, SR-083): it is open while any run is held, holds
 * each run by count, subscribes a newly held run and unsubscribes one no longer held, and subscribes every held run again
 * on each (re)connect, whose snapshot replaces the answers it had.
 *
 * It follows the one live-stream lifecycle of the window's other streams (autobyteus-434/435, CR-461-096, CR-461-097):
 * - when it tries again is the shared scheduler's: a capped wait while the page is visible, nothing while it is hidden,
 *   an attempt at once on a page resume, and a re-synchronization after a long hide;
 * - a credential-ending close (4401, or 4403 with an ending code) stops it: connecting again would only be refused again.
 *   It connects again when the window is bound again (`rebind`);
 * - a run's rows notice (`RUN_TREE_CHANGED`) makes its views read again, so while the page is hidden it is held (one per
 *   run) and delivered on the page resume: nothing is read in the background (autobyteus-435 AC-006);
 * - a reconnect after a loss catches up as the other streams do: the snapshot replaces the statuses, and each held run
 *   gets one rows notice, since a change of its rows while the connection was lost reached no one.
 */
export class RunStatusFeed {
  private socket: RunStatusSocket | null = null
  private open = false
  private readonly held = new Map<string, { ref: RunStatusRunRef; count: number }>()
  /** A credential-ending close (or the session's end) stopped the feed; it connects again only when bound again. */
  private refused = false
  /** Rows notices that came while the page was hidden, one per run, delivered on the page resume. */
  private readonly heldTreeChanges = new Map<string, RunStatusServerMessage>()
  /** The connection was lost (or re-synchronized) since it was last open: the next open catches up. */
  private lost = false
  private readonly reconnect = new LiveStreamReconnectScheduler({
    attempt: () => this.attempt(),
    resynchronize: () => { this.dropSocket(); this.lost = true; this.reconnect.attemptNow() },
  })

  constructor(private readonly options: Readonly<{
    endpoint(): string | null
    deliver(message: RunStatusServerMessage): void
    createSocket?(url: string): RunStatusSocket
  }>) {
    subscribePageResume(() => this.deliverHeldTreeChanges())
  }

  /** Follows these runs until the returned release is called. */
  hold(refs: readonly RunStatusRunRef[]): () => void {
    const added: RunStatusRunRef[] = []
    for (const ref of refs) {
      const entry = this.held.get(keyOf(ref))
      if (entry) entry.count += 1
      else { this.held.set(keyOf(ref), { ref, count: 1 }); added.push(ref) }
    }
    if (this.socket) { if (added.length) this.send('SUBSCRIBE', added) }
    // A wait or a loss held while hidden attempts by itself, and subscribes every held run then.
    else if (!this.reconnect.isRecovering()) this.attempt()
    let released = false
    return () => {
      if (released) return
      released = true
      const removed: RunStatusRunRef[] = []
      for (const ref of refs) {
        const entry = this.held.get(keyOf(ref))
        if (!entry || --entry.count > 0) continue
        this.held.delete(keyOf(ref))
        this.heldTreeChanges.delete(keyOf(ref))
        removed.push(ref)
      }
      if (removed.length) this.send('UNSUBSCRIBE', removed)
      if (this.held.size === 0) { this.dropSocket(); this.reconnect.startOver() }
    }
  }

  /** The window was bound to another node, or bound again: connect there. */
  rebind(): void {
    this.refused = false
    this.dropSocket()
    this.reconnect.startOver()
    this.attempt()
  }

  /** The window's session ended (its credential is gone): close, and do not reconnect until bound again. */
  suspend(): void {
    this.refused = true
    this.dropSocket()
    this.reconnect.startOver()
  }

  private send(type: 'SUBSCRIBE' | 'UNSUBSCRIBE', runs: readonly RunStatusRunRef[]): void {
    if (!this.socket || !this.open) return
    try { this.socket.send(serializeRunStatusMessage({ type, payload: { runs: [...runs] } })) } catch { /* the close reconnects */ }
  }

  /** The first connect, and the scheduler's attempt. */
  private attempt(): void {
    if (this.socket) return
    const url = this.refused || this.held.size === 0 ? null : this.options.endpoint()
    if (!url) { this.reconnect.startOver(); return }
    const socket = (this.options.createSocket ?? ((value: string) => new WebSocket(value) as unknown as RunStatusSocket))(url)
    this.socket = socket
    this.open = false
    socket.onopen = () => {
      if (this.socket !== socket) return
      this.open = true
      this.reconnect.connected()
      const refs = [...this.held.values()].map((entry) => entry.ref)
      this.send('SUBSCRIBE', refs)
      if (this.lost) {
        this.lost = false
        for (const ref of refs) this.deliver({ type: 'RUN_TREE_CHANGED', payload: { kind: ref.kind, runId: ref.runId } })
      }
    }
    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      let message: RunStatusServerMessage
      try { message = parseRunStatusServerMessage(JSON.parse(String(event.data))) } catch { console.warn('Ignored an unrecognized run status frame.'); return }
      this.deliver(message)
    }
    socket.onerror = () => undefined
    socket.onclose = (event) => {
      if (this.socket !== socket) return
      this.socket = null
      this.open = false
      if (this.held.size === 0) { this.reconnect.startOver(); return }
      if (isCredentialRefusalClose(event?.code ?? 0, event?.reason)) {
        console.warn('The node refused this window\'s credential: run statuses stop until the window connects again.')
        this.refused = true
        this.reconnect.startOver()
        return
      }
      this.lost = true
      this.reconnect.connectionLost()
    }
  }

  private deliver(message: RunStatusServerMessage): void {
    if (message.type === 'RUN_TREE_CHANGED' && !isPageVisible()) {
      this.heldTreeChanges.set(keyOf(message.payload), message)
      return
    }
    this.options.deliver(message)
  }

  private deliverHeldTreeChanges(): void {
    const held = [...this.heldTreeChanges.values()]
    this.heldTreeChanges.clear()
    for (const message of held) this.options.deliver(message)
  }

  private dropSocket(): void {
    const socket = this.socket
    this.socket = null
    this.open = false
    if (socket) { socket.onclose = null; socket.onmessage = null; socket.onopen = null; try { socket.close() } catch { /* already closed */ } }
  }
}
