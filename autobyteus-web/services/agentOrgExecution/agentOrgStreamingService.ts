import { readAgentOrgRunInspection } from './agentOrgRunInspection'
import type { OrgWorkspaceSelection } from './agentOrgExecutionViewIndex'
import {
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamClientMessage,
} from '@autobyteus/collaboration-stream-contracts'
import { shallowReactive } from 'vue'
import type { ContextFilePath } from '~/types/conversation'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { GetAgentOrgExecutionCheckpoint } from '~/graphql/queries/runHistoryQueries'
import { getApolloClient } from '~/utils/apolloClient'
import { stageAgentOrgExecutionContext } from './agentOrgContextHydration'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { AgentOrgExecutionContext } from './agentOrgExecutionContext'
import type { CollaboratorMentionDto } from '~/utils/collaborators/collaboratorMentionText'
import { createRandomId } from '~/utils/randomId'
import { LiveStreamReconnectScheduler } from '~/services/liveStreamLifecycle/liveStreamReconnectScheduler'
import { isCredentialRefusalClose } from '~/services/liveStreamLifecycle/credentialRefusalClose'
import { HeldUntilRebind } from '~/services/agentStreaming/heldUntilRebind'
import { orgCommandFailure } from './agentOrgCommandFailures'
import { AgentOrgPendingCommands } from './agentOrgPendingCommands'

type ExecutionCheckpoint = Readonly<{
  orgRunId: string
  changeSequence: number
  hasOpenExecutionWork: boolean
}>
type StreamGeneration = Readonly<{
  id: number
  socket: WebSocket
}>
type AgentOrgStreamPhase = 'disconnected' | 'awaiting_connected_root' | 'awaiting_snapshot' | 'ready'

const attachmentLocator = (attachment: ContextFilePath): string => attachment.locator
const INVALID_STREAM_CLOSE_CODE = 4000

export class AgentOrgStreamingService {
  private socket: WebSocket | null = null
  private context: AgentOrgExecutionContext | null = null
  private processing: Promise<void> = Promise.resolve()
  private readonly readiness = new Set<{ resolve(): void; reject(error: Error): void }>()
  /** Stops lost with a connection that recovers: settled once the snapshot that makes the stream ready is applied. */
  private readonly interruptsAwaitingRebind = new HeldUntilRebind()
  /** Its commands waiting for their answers. */
  private readonly commands: AgentOrgPendingCommands
  private nextGenerationId = 0
  private activeGeneration: StreamGeneration | null = null
  private released = false
  private intentionalClose = false
  private recoveryCheckpoint: ExecutionCheckpoint | null = null
  private recoveryFocus: OrgWorkspaceSelection | null = null
  private streamPhase: AgentOrgStreamPhase = 'disconnected'
  private transparentRecoveryInFlight = false
  private lastFailureDetail = 'AgentOrg stream recovery is required.'
  /** When this stream tries again (autobyteus-434); its success point is the accepted snapshot. */
  private readonly reconnect = new LiveStreamReconnectScheduler({
    attempt: () => { void this.attemptTransparentRecovery() },
    resynchronize: () => this.retireAndRecover(),
    onPersistentFailure: () => {
      this.options.reportError(this.lastFailureDetail)
      this.settleReadiness(new Error(this.lastFailureDetail))
    },
  })

  constructor(private readonly options: Readonly<{
    orgRunId: string
    publish(context: AgentOrgExecutionContext, commit: () => string | null): void
    onInactive?(): void
    reportError(message: string): void
    onAcceptedExternalUserMessage?(event: Readonly<{
      orgRunId: string
      agentRunId: string
      commandId: string
    }>): void
  }>) {
    this.commands = new AgentOrgPendingCommands({
      orgRunId: options.orgRunId,
      interruptsAwaitingRebind: this.interruptsAwaitingRebind,
      onAcceptedExternalUserMessage: (event) => options.onAcceptedExternalUserMessage?.(event),
    })
  }

  connect(): void {
    if (this.released) return
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return
    this.reconnect.startOver()
    if (this.context?.phase === 'reopen_required') {
      this.lastFailureDetail = this.context.error ?? 'AgentOrg stream recovery is required.'
      this.reconnect.attemptNow()
      return
    }
    try {
      this.openSocket()
    } catch (cause) {
      this.recoveryFailed(this.detail(cause))
    }
  }

  requestRecovery(): void {
    // In a loss streak the scheduler (or the page resume) attempts; nothing to do here.
    if (this.released || this.isReady() || this.socket || this.activeGeneration
      || this.reconnect.isRecovering() || this.transparentRecoveryInFlight
      || this.context?.phase !== 'reopen_required') return
    this.lastFailureDetail = this.context.error ?? 'AgentOrg stream recovery is required.'
    this.reconnect.startOver()
    this.reconnect.attemptNow()
  }

  private openSocket(): void {
    if (this.released) return
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return
    const endpoint = `${useWindowNodeContextStore().getBoundEndpoints().orgWs}/${encodeURIComponent(this.options.orgRunId)}`
    const socket = new WebSocket(buildAuthenticatedWebSocketUrl(
      endpoint,
      getActiveRemoteAccessCredential() ?? '',
    ))
    const generation = Object.freeze({ id: ++this.nextGenerationId, socket })
    this.intentionalClose = false
    this.socket = socket
    this.activeGeneration = generation
    this.streamPhase = 'awaiting_connected_root'
    socket.onmessage = (raw) => {
      this.processing = this.processing
        .then(() => this.processFrame(generation, String(raw.data)))
    }
    socket.onerror = () => undefined
    socket.onclose = (event) => {
      if (!this.isCurrent(generation)) return
      const shouldRecover = !this.intentionalClose
      this.socket = null
      this.activeGeneration = null
      this.streamPhase = 'disconnected'
      const detail = 'AgentOrg stream closed before a complete synchronized view was available.'
      if (shouldRecover && this.context) this.context.requireReopen(detail)
      this.commands.rejectAll('AgentOrg stream closed before command acknowledgement.')
      // A credential refusal (autobyteus-435): connecting again would be refused again; a later connect starts over.
      if (shouldRecover && isCredentialRefusalClose(event.code, event.reason)) { this.reconnect.startOver(); this.interruptsAwaitingRebind.settle() }
      else if (shouldRecover) this.recoveryFailed(detail)
    }
  }

  private async reopenOwned(generation: StreamGeneration | null): Promise<void> {
    if (!this.ownsOperation(generation)) return
    if (generation === null) {
      const view = await readAgentOrgRunInspection(this.options.orgRunId)
      if (!this.ownsOperation(null)) return
      // A stopped Org's stream continues (autobyteus-461 SR-045): its stored-mode snapshot is a new base, with no checkpoint.
      if (!view.is_active) {
        this.recoveryCheckpoint = null
        this.recoveryFocus = this.context?.selection ?? null
        this.openSocket()
        return
      }
    }
    let checkpoint: ExecutionCheckpoint
    try {
      checkpoint = await this.fetchCheckpoint()
    } catch (cause) {
      if (!this.ownsOperation(generation)) return
      throw cause
    }
    if (!this.ownsOperation(generation)) return
    this.recoveryCheckpoint = checkpoint
    this.recoveryFocus = this.context?.selection ?? null
    this.closeSocket('AgentOrg checkpointed recovery')
    if (this.released) return
    this.openSocket()
  }

  private get treeRef() { return { kind: 'agent_org' as const, runId: this.options.orgRunId } }

  disconnect(): void {
    this.released = true
    this.reconnect.dispose()
    this.closeSocket('AgentOrg context released')
    useRunTreeStore().streamEnded(this.treeRef)
    this.context = null
    this.recoveryCheckpoint = null
    this.recoveryFocus = null
    // Released for good: closeSocket held its Stops; they end now.
    this.interruptsAwaitingRebind.settle()
    this.settleReadiness(new Error('AgentOrg context was released.'))
  }

  isReady(): boolean {
    return !this.released && this.streamPhase === 'ready' && this.context?.phase !== 'reopen_required'
      && this.socket?.readyState === WebSocket.OPEN
  }

  whenReady(): Promise<void> {
    if (this.isReady()) return Promise.resolve()
    if (this.released) return Promise.reject(new Error('AgentOrg context was released.'))
    return new Promise((resolve, reject) => { this.readiness.add({ resolve, reject }) })
  }

  private settleReadiness(error?: Error): void {
    for (const waiter of this.readiness) error ? waiter.reject(error) : waiter.resolve()
    this.readiness.clear()
  }

  sendPrepared(input: Readonly<{ agentRunId: string; content: string;
    attachments: readonly ContextFilePath[]; messageId: string; dedupeKey: string;
    mentions?: readonly CollaboratorMentionDto[] }>): Promise<void> {
    const context = this.requireReadyContext('SEND_MESSAGE')
    context.index.requireAgent(input.agentRunId)
    return this.command({ type: 'SEND_MESSAGE', payload: {
      ...this.commandRoot(input.agentRunId), content: input.content,
      context_file_paths: input.attachments.map(attachmentLocator), image_urls: [],
      message_id: input.messageId, dedupe_key: input.dedupeKey,
      ...(input.mentions?.length ? { mentions: input.mentions.map((mention) => ({ ...mention })) } : {}),
    } })
  }

  interrupt(agentRunId: string): Promise<void> {
    return this.command({ type: 'INTERRUPT_GENERATION', payload: this.commandRoot(agentRunId) })
  }

  decideTool(agentRunId: string, invocationId: string, approved: boolean, reason: string | null): Promise<void> {
    return this.command({ type: approved ? 'APPROVE_TOOL' : 'DENY_TOOL', payload: {
      ...this.commandRoot(agentRunId), invocation_id: invocationId, reason,
    } })
  }

  private commandRoot(targetAgentRunId: string) {
    return {
      root_subject_kind: 'agent_org' as const,
      root_run_id: this.options.orgRunId,
      target_agent_run_id: targetAgentRunId,
      command_id: createRandomId(),
    }
  }

  private requireReadyContext(commandType: CollaborationStreamClientMessage['type']): AgentOrgExecutionContext {
    // Ready is the stream's own: open, with its snapshot applied, the Org active or stopped (autobyteus-461 SR-045).
    if (!this.isReady()) throw orgCommandFailure(commandType, 'not_sent', 'AgentOrg interaction stream is not ready.')
    return this.context!
  }

  private async command(message: CollaborationStreamClientMessage): Promise<void> {
    this.requireReadyContext(message.type)
    return this.commands.send(this.socket!, message)
  }

  private async handleMessage(generation: StreamGeneration, raw: string): Promise<void> {
    const message = CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))
    if (message.type === 'ERROR') {
      throw new Error(`${message.payload.code}: ${message.payload.message}`)
    }
    if (message.payload.root_run_id !== this.options.orgRunId
      || message.payload.root_subject_kind !== 'agent_org') {
      throw new Error(`AgentOrg stream correlation mismatch for '${this.options.orgRunId}'.`)
    }
    if (message.type === 'CONNECTED') {
      if (this.streamPhase !== 'awaiting_connected_root') {
        throw new Error('AgentOrg stream CONNECTED message arrived out of order.')
      }
      this.streamPhase = 'awaiting_snapshot'
      return
    }
    if (message.type === 'AGENT_COMMAND_ACK') {
      if (this.streamPhase !== 'ready') throw new Error('AgentOrg command acknowledgement arrived before the snapshot barrier.')
      this.commands.acknowledge(message)
      return
    }
    if (message.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT') {
      // After the barrier, a snapshot is in-band: the Org started or stopped, a new sequence base (SR-046).
      if (this.streamPhase !== 'awaiting_snapshot' && this.streamPhase !== 'ready') throw new Error('AgentOrg snapshot arrived before CONNECTED.')
      if (message.payload.root_subject_kind !== 'agent_org') {
        throw new Error('AgentOrg stream supplied a non-Org snapshot.')
      }
      const previousFocus = this.recoveryFocus ?? this.context?.selection ?? null
      const staged = await stageAgentOrgExecutionContext({
        source: 'stream',
        orgRunId: this.options.orgRunId,
        view: message.payload.root_org,
        focus: previousFocus,
        isCurrent: () => this.isCurrent(generation),
      })
      if (!this.isCurrent(generation)) return
      if (!await this.verifyRecoveryCandidate(staged.context, generation)) return
      if (!this.isCurrent(generation)) return
      // The stream and every Vue observer must retain the same observable
      // identity. Mutating a raw class instance after publishing its Vue proxy
      // leaves top-level task-record replacements invisible until another UI
      // action happens to invalidate the consumer.
      const candidate = shallowReactive(staged.context)
      if (previousFocus) candidate.select(previousFocus)
      this.options.publish(candidate, staged.commit)
      this.context = candidate
      this.recoveryCheckpoint = null
      this.recoveryFocus = null
      this.streamPhase = 'ready'
      this.reconnect.connected()
      this.settleReadiness()
      this.interruptsAwaitingRebind.settle()
      return
    }
    if (!this.context || this.streamPhase !== 'ready') {
      throw new Error('AgentOrg stream event arrived before the snapshot barrier.')
    }
    if (message.type === 'RUN_TREE_SNAPSHOT') {
      // The Org's tree at the view's base (SR-084), after each snapshot; its changes follow as numbered events.
      if (message.payload.root_subject_kind !== 'agent_org' || message.payload.base_change_sequence !== this.context.changeSequence) {
        throw new Error('AgentOrg run tree snapshot is not at the view\'s base.')
      }
      useRunTreeStore().streamSnapshot(this.treeRef, message.payload.rows)
      return
    }
    if (message.type === 'ROOT_EXECUTION_EVENT') {
      if (message.payload.root_subject_kind !== 'agent_org') {
        throw new Error('AgentOrg stream supplied a non-Org event.')
      }
      const { change_sequence: first, change_sequence_through: through } = message.payload
      this.context.applyEvent(first, message.payload.event, through)
      // The Team tab's lists are consistent through it (SR-004).
      useCollaborationParticipantMessagesStore().advance('agent_org', this.options.orgRunId, this.context.view.live_sequence_id, through ?? first)
      return
    }
    // The Org's own lifecycle updates the view; the stream continues (autobyteus-461 SR-045).
    this.context.setActive(message.payload.is_active)
    if (!message.payload.is_active) this.options.onInactive?.()
  }

  private async processFrame(generation: StreamGeneration, raw: string): Promise<void> {
    if (!this.isCurrent(generation)) return
    try {
      await this.handleMessage(generation, raw)
    } catch (cause) {
      if (this.isCurrent(generation)) this.failClosed(cause, generation)
    }
  }

  private isCurrent(generation: StreamGeneration): boolean {
    return this.activeGeneration?.id === generation.id
      && this.activeGeneration.socket === generation.socket
      && this.socket === generation.socket
  }

  private ownsOperation(generation: StreamGeneration | null): boolean {
    if (this.released) return false
    return generation === null
      ? this.activeGeneration === null && this.socket === null
      : this.isCurrent(generation)
  }

  private failClosed(cause: unknown, generation: StreamGeneration): void {
    if (!this.isCurrent(generation)) return
    const detail = this.detail(cause)
    this.context?.requireReopen(detail)
    this.intentionalClose = true
    this.streamPhase = 'disconnected'
    this.socket = null
    this.activeGeneration = null
    this.commands.rejectAll(detail)
    // Recovery owns the retired generation from this point forward. Schedule it
    // before asking the browser to close so a transport-level close failure can
    // never strand the workspace after strict admission has failed.
    this.recoveryFailed(detail)
    generation.socket.close(INVALID_STREAM_CLOSE_CODE, 'Invalid AgentOrg stream')
  }

  /** A loss, or a failed attempt before the snapshot: the scheduler waits and attempts again. */
  private recoveryFailed(detail: string): void {
    if (this.released) return
    // Meanwhile the Org's tree is read, as a listed run's is (SR-084).
    useRunTreeStore().streamEnded(this.treeRef)
    this.lastFailureDetail = detail
    this.reconnect.connectionLost()
  }

  /** The scheduler's attempt: transparent recovery (inspection, checkpoint, snapshot), or a plain open without a context. */
  private async attemptTransparentRecovery(): Promise<void> {
    if (this.released || this.socket || this.transparentRecoveryInFlight) return
    this.transparentRecoveryInFlight = true
    let failure: unknown = null
    try {
      if (this.context) await this.reopenOwned(null)
      else this.openSocket()
    } catch (cause) {
      failure = cause
    } finally {
      this.transparentRecoveryInFlight = false
    }
    if (failure) this.recoveryFailed(this.detail(failure) || this.lastFailureDetail)
  }

  /** The page was hidden ≥ 30 s: retire the current generation, then recover it from a fresh inspection. */
  private retireAndRecover(): void {
    this.commands.rejectAll('AgentOrg stream is re-synchronizing.')
    this.closeSocket('AgentOrg stream re-synchronizing')
    this.reconnect.attemptNow()
  }

  private detail(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause)
  }

  private closeSocket(reason: string): void {
    const generation = this.activeGeneration
    this.intentionalClose = true
    this.streamPhase = 'disconnected'
    this.socket = null
    this.activeGeneration = null
    generation?.socket.close(1000, reason)
    this.commands.rejectAll('AgentOrg stream closed before command acknowledgement.')
  }

  private async fetchCheckpoint(): Promise<ExecutionCheckpoint> {
    const response = await getApolloClient().query<{
      getAgentOrgExecutionCheckpoint: ExecutionCheckpoint
    }>({
      query: GetAgentOrgExecutionCheckpoint,
      variables: { orgRunId: this.options.orgRunId },
      fetchPolicy: 'network-only',
    })
    const checkpoint = response.data?.getAgentOrgExecutionCheckpoint
    if (!checkpoint || checkpoint.orgRunId !== this.options.orgRunId
      || !Number.isSafeInteger(checkpoint.changeSequence) || checkpoint.changeSequence < 0) {
      throw new Error(`Invalid AgentOrg execution checkpoint for '${this.options.orgRunId}'.`)
    }
    return checkpoint
  }

  private async verifyRecoveryCandidate(
    candidate: AgentOrgExecutionContext,
    generation: StreamGeneration,
  ): Promise<boolean> {
    const before = this.recoveryCheckpoint
    if (!before) return true
    const after = await this.fetchCheckpoint()
    if (!this.isCurrent(generation)) return false
    if (candidate.changeSequence < before.changeSequence
      || candidate.changeSequence > after.changeSequence) {
      throw new Error('AgentOrg recovery snapshot does not fall within the verified checkpoint window.')
    }
    if (!before.hasOpenExecutionWork && !after.hasOpenExecutionWork
      && (before.changeSequence !== after.changeSequence
        || candidate.changeSequence !== after.changeSequence)) {
      throw new Error('AgentOrg recovery checkpoint changed without open execution work.')
    }
    return true
  }
}
