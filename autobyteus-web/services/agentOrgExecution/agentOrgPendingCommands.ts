import type {
  CollaborationStreamClientMessage,
  CollaborationStreamServerMessage,
} from '@autobyteus/collaboration-stream-contracts'
import { collaboratorAddRejectionOf } from '~/services/collaborators/collaboratorAddFailures'
import type { HeldUntilRebind } from '~/services/agentStreaming/heldUntilRebind'
import { AgentOrgConnectionLostError, orgCommandFailure } from './agentOrgCommandFailures'

export type AgentOrgCommandAck = Extract<CollaborationStreamServerMessage, { type: 'AGENT_COMMAND_ACK' }>
type PendingCommand = Readonly<{
  commandType: CollaborationStreamClientMessage['type']
  targetAgentRunId: string
  resolve(): void
  reject(error: Error): void
  timeout: ReturnType<typeof setTimeout>
}>

const COMMAND_ACK_TIMEOUT_MS = 15_000

/**
 * The Org stream's commands waiting for their answers (split from `AgentOrgStreamingService`, autobyteus-541 D-E1):
 * each resolves with its acknowledgement or rejects with its refusal; one lost with its connection fails, a Stop is held
 * until the rebind (533 D-W7).
 */
export class AgentOrgPendingCommands {
  private readonly pending = new Map<string, PendingCommand>()

  constructor(private readonly options: Readonly<{
    orgRunId: string
    interruptsAwaitingRebind: HeldUntilRebind
    onAcceptedExternalUserMessage?(event: Readonly<{ orgRunId: string; agentRunId: string; commandId: string }>): void
  }>) {}

  /** Sends the command on `socket` and waits for its acknowledgement. */
  send(socket: WebSocket, message: CollaborationStreamClientMessage): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(message.payload.command_id)
        reject(new Error(`AgentOrg command '${message.payload.command_id}' acknowledgement timed out.`))
      }, COMMAND_ACK_TIMEOUT_MS)
      this.pending.set(message.payload.command_id, Object.freeze({
        commandType: message.type,
        targetAgentRunId: message.payload.target_agent_run_id,
        resolve,
        reject,
        timeout,
      }))
      try {
        socket.send(JSON.stringify(message))
      } catch (cause) {
        clearTimeout(timeout)
        this.pending.delete(message.payload.command_id)
        reject(orgCommandFailure(message.type, 'not_sent', cause instanceof Error ? cause.message : String(cause)))
      }
    })
  }

  /** Settles the command the acknowledgement names; one naming no pending command, or another one, is invalid. */
  acknowledge(message: AgentOrgCommandAck): void {
    const command = this.pending.get(message.payload.command_id)
    if (!command) {
      throw new Error(`AgentOrg command acknowledgement '${message.payload.command_id}' has no pending command.`)
    }
    if (command.commandType !== message.payload.command_type
      || command.targetAgentRunId !== message.payload.target_agent_run_id) {
      throw new Error(`AgentOrg command acknowledgement '${message.payload.command_id}' identity mismatch.`)
    }
    clearTimeout(command.timeout)
    this.pending.delete(message.payload.command_id)
    if (message.payload.state === 'accepted') {
      command.resolve()
      if (command.commandType === 'SEND_MESSAGE') {
        try {
          this.options.onAcceptedExternalUserMessage?.({
            orgRunId: this.options.orgRunId,
            agentRunId: command.targetAgentRunId,
            commandId: message.payload.command_id,
          })
        } catch (cause) {
          console.error('Accepted AgentOrg message history refresh could not be requested.', cause)
        }
      }
    } else command.reject(collaboratorAddRejectionOf(message.payload)
      ?? new Error(message.payload.message ?? message.payload.code ?? 'AgentOrg command rejected.'))
  }

  /** Commands lost with the connection fail (a message: `unknown`, 540 D-5); Stops are held until the rebind (D-W7). */
  rejectAll(message: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      if (pending.commandType === 'INTERRUPT_GENERATION') {
        this.options.interruptsAwaitingRebind.hold(() => pending.reject(new AgentOrgConnectionLostError()))
      } else pending.reject(orgCommandFailure(pending.commandType, 'unknown', message))
    }
    this.pending.clear()
  }
}
