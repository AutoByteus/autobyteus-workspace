import type { AgentOrgStreamingService } from '~/services/agentOrgExecution/agentOrgStreamingService'
import { AgentOrgConnectionLostError } from '~/services/agentOrgExecution/agentOrgCommandFailures'
import {
  INTERRUPT_ACCEPTED,
  INTERRUPT_CONNECTION_LOST,
  INTERRUPT_NOT_SENT,
} from '~/services/agentStreaming/interruptCommandAdmission'
import type { InterruptOutcome } from '~/services/agentStreaming/protocol/agentCommandTypes'

/**
 * An Org agent's Stop as an outcome (autobyteus-533 D-W4): the Org stream's command resolves when the node accepts it
 * and rejects otherwise; this says what that means for the Stop. A stream that is not ready sends nothing.
 */
export const orgInterruptOutcome = async (
  service: Pick<AgentOrgStreamingService, 'isReady' | 'interrupt'>,
  agentRunId: string,
): Promise<InterruptOutcome> => {
  if (!service.isReady()) {
    console.warn('Stop was not sent: the AgentOrg stream is not ready.')
    return INTERRUPT_NOT_SENT
  }
  try {
    await service.interrupt(agentRunId)
    return INTERRUPT_ACCEPTED
  } catch (error) {
    if (error instanceof AgentOrgConnectionLostError) return INTERRUPT_CONNECTION_LOST
    return Object.freeze({ kind: 'refused', detail: error instanceof Error ? error.message : String(error) })
  }
}
