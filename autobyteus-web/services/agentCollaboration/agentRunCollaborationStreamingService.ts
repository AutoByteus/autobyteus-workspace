import { collaboratorAddRejectionOf } from '~/services/collaborators/collaboratorAddFailures'
import {
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamClientMessage,
  type CollaborationStreamServerMessage,
} from '@autobyteus/collaboration-stream-contracts'
import { shallowReactive } from 'vue'
import type { ContextFilePath } from '~/types/conversation'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import type { CollaboratorMentionDto } from '~/utils/collaborators/collaboratorMentionText'
import { stageAgentRunCollaborationContext } from './agentRunCollaborationHydration'
import type { AgentRunCollaborationContext } from './agentRunCollaborationContext'

type CommandAck = Extract<CollaborationStreamServerMessage, { type: 'AGENT_COMMAND_ACK' }>
type PendingCommand = Readonly<{
  commandType: CollaborationStreamClientMessage['type']
  targetAgentRunId: string
  resolve(): void
  reject(error: Error): void
  timeout: ReturnType<typeof setTimeout>
}>
type Phase = 'disconnected' | 'awaiting_connected' | 'awaiting_snapshot' | 'ready'

const MAX_RECOVERY_ATTEMPTS = 5
const COMMAND_TIMEOUT_MS = 15_000
const recoveryDelay = (attempt: number): number => attempt === 0 ? 0 : Math.min(1_000 * (2 ** (attempt - 1)), 30_000)

/**
 * The live stream of a standalone run's collaboration root (`/ws/agent-collaboration/:hostRunId`).
 * Connecting makes the root command-ready, which restores a stopped host: callers attach it only
 * for an active host or when the user sends to a child. Each snapshot republishes the context;
 * a newly started child reloads through a fresh snapshot.
 */
export class AgentRunCollaborationStreamingService {
  private socket: WebSocket | null = null
  private context: AgentRunCollaborationContext | null = null
  private phase: Phase = 'disconnected'
  private processing: Promise<void> = Promise.resolve()
  private readonly pending = new Map<string, PendingCommand>()
  private readonly readiness = new Set<{ resolve(): void; reject(error: Error): void }>()
  private released = false
  private intentionalClose = false
  private recoveryAttempts = 0
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: Readonly<{
    hostRunId: string
    publish(context: AgentRunCollaborationContext, commitActivities: () => void): void
    onInactive(): void
    reportError(message: string): void
    /** A collaborator was added in place (its new Team opens once). */
    onCollaboratorAdded?(context: AgentRunCollaborationContext): void
  }>) {}

  connect(): void {
    if (this.released || this.socket) return
    const endpoint = `${useWindowNodeContextStore().getBoundEndpoints().agentCollaborationWs}/${encodeURIComponent(this.options.hostRunId)}`
    const socket = new WebSocket(buildAuthenticatedWebSocketUrl(endpoint, getActiveRemoteAccessCredential() ?? ''))
    this.socket = socket
    this.phase = 'awaiting_connected'
    this.intentionalClose = false
    socket.onmessage = (raw) => {
      this.processing = this.processing.then(() => this.processFrame(socket, String(raw.data)))
    }
    socket.onerror = () => undefined
    socket.onclose = (event) => {
      if (this.socket !== socket) return
      this.socket = null
      this.phase = 'disconnected'
      this.rejectPending('The Agent collaboration stream closed before command acknowledgement.')
      // 4004: this run cannot host collaborators; retrying cannot help.
      if (!this.intentionalClose && event.code !== 4004) this.scheduleRecovery('The Agent collaboration stream closed.')
      else if (event.code === 4004) this.settleReadiness(new Error('This run cannot host collaborators.'))
    }
  }

  isReady(): boolean {
    return !this.released && this.phase === 'ready' && this.context?.phase === 'live'
      && this.socket?.readyState === WebSocket.OPEN
  }

  whenReady(): Promise<void> {
    if (this.isReady()) return Promise.resolve()
    if (this.released) return Promise.reject(new Error('The Agent collaboration view was released.'))
    return new Promise((resolve, reject) => { this.readiness.add({ resolve, reject }) })
  }

  disconnect(): void {
    this.released = true
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer)
    this.recoveryTimer = null
    this.closeSocket('Agent collaboration view released')
    this.context = null
    this.settleReadiness(new Error('The Agent collaboration view was released.'))
  }

  sendMessage(input: Readonly<{ agentRunId: string; content: string; attachments: readonly ContextFilePath[];
    messageId: string; dedupeKey: string; mentions?: readonly CollaboratorMentionDto[] }>): Promise<void> {
    return this.command({ type: 'SEND_MESSAGE', payload: {
      ...this.commandRoot(input.agentRunId), content: input.content,
      context_file_paths: input.attachments.map((attachment) => attachment.locator), image_urls: [],
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
      root_subject_kind: 'agent' as const,
      root_run_id: this.options.hostRunId,
      target_agent_run_id: targetAgentRunId,
      command_id: crypto.randomUUID(),
    }
  }

  private command(message: CollaborationStreamClientMessage): Promise<void> {
    if (!this.isReady()) return Promise.reject(new Error('The Agent collaboration stream is not ready.'))
    const socket = this.socket!
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(message.payload.command_id)
        reject(new Error(`Agent collaboration command '${message.payload.command_id}' acknowledgement timed out.`))
      }, COMMAND_TIMEOUT_MS)
      this.pending.set(message.payload.command_id, Object.freeze({
        commandType: message.type, targetAgentRunId: message.payload.target_agent_run_id, resolve, reject, timeout,
      }))
      try {
        socket.send(JSON.stringify(message))
      } catch (cause) {
        clearTimeout(timeout)
        this.pending.delete(message.payload.command_id)
        reject(cause instanceof Error ? cause : new Error(String(cause)))
      }
    })
  }

  private async processFrame(socket: WebSocket, raw: string): Promise<void> {
    if (this.socket !== socket) return
    try {
      await this.handleMessage(socket, raw)
    } catch (cause) {
      if (this.socket !== socket) return
      const detail = cause instanceof Error ? cause.message : String(cause)
      this.context?.requireReopen(detail)
      this.closeSocket('Invalid Agent collaboration stream')
      this.scheduleRecovery(detail)
    }
  }

  private async handleMessage(socket: WebSocket, raw: string): Promise<void> {
    const message = CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))
    if (message.type === 'ERROR') {
      this.settleReadiness(new Error(message.payload.message))
      this.options.reportError(message.payload.message)
      return
    }
    if (message.payload.root_subject_kind !== 'agent' || message.payload.root_run_id !== this.options.hostRunId) {
      throw new Error(`Agent collaboration stream correlation mismatch for '${this.options.hostRunId}'.`)
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
      const staged = await stageAgentRunCollaborationContext({
        hostRunId: this.options.hostRunId, view: message.payload.root_agent, isCurrent: () => this.socket === socket,
      })
      if (this.socket !== socket) return
      const candidate = shallowReactive(staged.context)
      this.options.publish(candidate, staged.commitActivities)
      this.context = candidate
      this.phase = 'ready'
      this.recoveryAttempts = 0
      if (candidate.isActive) this.settleReadiness()
      else { this.options.onInactive(); this.disconnect() }
      return
    }
    if (!this.context || this.phase !== 'ready') throw new Error('Agent collaboration event arrived before the snapshot.')
    if (message.type === 'AGENT_COMMAND_ACK') {
      this.acknowledge(message)
      return
    }
    if (message.type === 'ROOT_EXECUTION_EVENT') {
      if (message.payload.root_subject_kind !== 'agent') throw new Error('Agent collaboration stream supplied a foreign event.')
      if (this.context.applyEvent(message.payload.change_sequence, message.payload.event) === 'checkpoint_required') {
        // A new child: reconnect for a fresh snapshot that includes its context.
        this.closeSocket('Agent collaboration reload')
        this.connect()
      } else if (message.payload.event.kind === 'collaborator_added') {
        this.options.onCollaboratorAdded?.(this.context)
      }
      return
    }
    this.context.setActive(message.payload.is_active)
    if (!message.payload.is_active) {
      this.options.onInactive()
      this.disconnect()
    }
  }

  private acknowledge(message: CommandAck): void {
    const command = this.pending.get(message.payload.command_id)
    if (!command) return
    if (command.commandType !== message.payload.command_type || command.targetAgentRunId !== message.payload.target_agent_run_id) {
      throw new Error(`Agent collaboration acknowledgement '${message.payload.command_id}' identity mismatch.`)
    }
    clearTimeout(command.timeout)
    this.pending.delete(message.payload.command_id)
    if (message.payload.state === 'accepted') command.resolve()
    else command.reject(collaboratorAddRejectionOf(message.payload)
      ?? new Error(message.payload.message ?? message.payload.code ?? 'Agent collaboration command rejected.'))
  }

  private scheduleRecovery(detail: string): void {
    if (this.released || this.recoveryTimer || this.socket) return
    if (this.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      this.options.reportError(detail)
      this.settleReadiness(new Error(detail))
      return
    }
    const delay = recoveryDelay(this.recoveryAttempts)
    this.recoveryAttempts += 1
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null
      this.connect()
    }, delay)
  }

  private closeSocket(reason: string): void {
    const socket = this.socket
    this.intentionalClose = true
    this.socket = null
    this.phase = 'disconnected'
    socket?.close(1000, reason)
    this.rejectPending('The Agent collaboration stream closed before command acknowledgement.')
  }

  private settleReadiness(error?: Error): void {
    for (const waiter of this.readiness) error ? waiter.reject(error) : waiter.resolve()
    this.readiness.clear()
  }

  private rejectPending(message: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(new Error(message))
    }
    this.pending.clear()
  }
}
