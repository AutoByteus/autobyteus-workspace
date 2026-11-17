import {
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamServerMessage,
} from '@autobyteus/collaboration-stream-contracts'
import { shallowReactive } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { AgentRunCollaborationContext } from './agentRunCollaborationContext'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { LiveStreamReconnectScheduler } from '~/services/liveStreamLifecycle/liveStreamReconnectScheduler'
import { isCredentialRefusalClose } from '~/services/liveStreamLifecycle/credentialRefusalClose'

type Phase = 'disconnected' | 'awaiting_connected' | 'awaiting_snapshot' | 'ready'

/**
 * The live stream of a standalone run's collaboration root (`/ws/agent-collaboration/:runId`): its view, its Team
 * tab's messages and its tree (autobyteus-461 SR-084). Connecting never restores the run's agent. Each snapshot
 * republishes the context; the tree's snapshot and changes feed `runTreeStore`.
 */
export class AgentRunCollaborationStreamingService {
  private socket: WebSocket | null = null
  private context: AgentRunCollaborationContext | null = null
  private phase: Phase = 'disconnected'
  private released = false
  private intentionalClose = false
  private lastFailureDetail = 'The Agent collaboration stream closed.'
  /** When this stream tries again (autobyteus-434); its success point is the accepted snapshot. */
  private readonly reconnect = new LiveStreamReconnectScheduler({
    attempt: () => this.attempt(),
    resynchronize: () => {
      this.closeSocket('Agent collaboration re-synchronize')
      this.reconnect.attemptNow()
    },
    onPersistentFailure: () => this.options.reportError(this.lastFailureDetail),
  })

  constructor(private readonly options: Readonly<{
    runId: string
    isCurrent(): boolean
    publish(context: AgentRunCollaborationContext): void
    reportError(message: string): void
  }>) {}

  /** The store's connect: starts over (any wait is cancelled) and opens. */
  connect(): void {
    if (this.released || !this.options.isCurrent() || this.socket) return
    this.reconnect.startOver()
    this.openSocket()
  }

  /** The scheduler's attempt. */
  private attempt(): void {
    if (this.released || this.socket) return
    if (!this.options.isCurrent()) this.reconnect.startOver()
    else this.openSocket()
  }

  private openSocket(): void {
    const endpoint = `${useWindowNodeContextStore().getBoundEndpoints().agentCollaborationWs}/${encodeURIComponent(this.options.runId)}`
    const socket = new WebSocket(buildAuthenticatedWebSocketUrl(endpoint, getActiveRemoteAccessCredential() ?? ''))
    this.socket = socket
    this.phase = 'awaiting_connected'
    this.intentionalClose = false
    socket.onmessage = (raw) => {
      this.processFrame(socket, String(raw.data))
    }
    socket.onerror = () => undefined
    socket.onclose = (event) => {
      if (this.socket !== socket) return
      this.socket = null
      this.phase = 'disconnected'
      // Whatever ended it, the view no longer feeds the run's tree: from now on its notices read it (CR-461-111). A
      // close while the view is not current (its run being stopped, its node changing) is not a loss to recover from.
      if (!this.released) useRunTreeStore().streamEnded(this.treeRef)
      if (!this.options.isCurrent()) return
      // 4004: this run cannot delegate (application- or system-owned); a credential refusal: the node refuses this client. Retrying
      // cannot help either.
      const finalClose = event.code === 4004 ? 'This run has no delegation view: it is application- or system-owned, so it cannot delegate.'
        : isCredentialRefusalClose(event.code, event.reason) ? 'The node refused this connection\'s credential.' : null
      if (!this.intentionalClose && !finalClose) this.recoveryFailed('The Agent collaboration stream closed.')
      else if (finalClose) this.reconnect.startOver()
    }
  }

  disconnect(): void {
    this.released = true
    this.reconnect.dispose()
    this.closeSocket('Agent collaboration view released')
    useRunTreeStore().streamEnded(this.treeRef)
    this.context = null
  }

  private get treeRef() { return { kind: 'agent' as const, runId: this.options.runId } }

  private processFrame(socket: WebSocket, raw: string): void {
    if (this.socket !== socket || !this.options.isCurrent()) return
    try {
      this.handleMessage(raw)
    } catch (cause) {
      if (this.socket !== socket || !this.options.isCurrent()) return
      const detail = cause instanceof Error ? cause.message : String(cause)
      this.context?.requireReopen(detail)
      this.closeSocket('Invalid Agent collaboration stream')
      this.recoveryFailed(detail)
    }
  }

  private handleMessage(raw: string): void {
    const message = CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))
    if (message.type === 'ERROR') {
      this.options.reportError(message.payload.message)
      return
    }
    if (message.payload.root_subject_kind !== 'agent' || message.payload.root_run_id !== this.options.runId) {
      throw new Error(`Agent collaboration stream correlation mismatch for '${this.options.runId}'.`)
    }
    if (message.type === 'CONNECTED') {
      if (this.phase !== 'awaiting_connected') throw new Error('Agent collaboration CONNECTED arrived out of order.')
      this.phase = 'awaiting_snapshot'
      return
    }
    if (message.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT') {
      if (this.phase !== 'awaiting_snapshot' || message.payload.root_subject_kind !== 'agent') {
        throw new Error('Agent collaboration snapshot arrived out of order.')
      }
      const candidate = shallowReactive(new AgentRunCollaborationContext({ runId: this.options.runId, view: message.payload.root_agent }))
      this.options.publish(candidate)
      this.context = candidate
      this.phase = 'ready'
      this.reconnect.connected()
      return
    }
    if (!this.context || this.phase !== 'ready') throw new Error('Agent collaboration event arrived before the snapshot.')
    if (message.type === 'RUN_TREE_SNAPSHOT') {
      // The run's tree at the view's base (SR-084); its changes follow as numbered events.
      if (message.payload.base_change_sequence !== this.context.changeSequence) throw new Error('Agent run tree snapshot is not at the view\'s base.')
      useRunTreeStore().streamSnapshot(this.treeRef, message.payload.rows)
      return
    }
    if (message.type === 'AGENT_COMMAND_ACK') throw new Error('An Agent collaboration acknowledgement arrived for a command this view never sends.')
    if (message.type === 'ROOT_EXECUTION_EVENT') {
      if (message.payload.root_subject_kind !== 'agent') throw new Error('Agent collaboration stream supplied a foreign event.')
      const sequence = message.payload.change_sequence
      this.context.applyEvent(sequence, message.payload.event)
      // The Team tab's lists are consistent through it (SR-004).
      useCollaborationParticipantMessagesStore().advance('agent', this.options.runId, this.context.view.live_sequence_id, sequence)
      return
    }
    // The run's own agent started or stopped: the view says so and its stream continues (SR-045).
    this.context.setActive(message.payload.is_active)
  }

  /** A loss, or a failed attempt before the snapshot: the scheduler waits and attempts again. */
  private recoveryFailed(detail: string): void {
    if (this.released || !this.options.isCurrent()) return
    // Meanwhile the run's tree is read, as a listed run's is (SR-084).
    useRunTreeStore().streamEnded(this.treeRef)
    this.lastFailureDetail = detail
    this.reconnect.connectionLost()
  }

  private closeSocket(reason: string): void {
    const socket = this.socket
    this.intentionalClose = true
    this.socket = null
    this.phase = 'disconnected'
    socket?.close(1000, reason)
  }


}
