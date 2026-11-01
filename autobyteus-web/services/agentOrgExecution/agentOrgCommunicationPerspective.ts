import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { AgentOrgCommunicationMessageDto } from '@autobyteus/collaboration-stream-contracts'
import type { CollaborationMessageMemberIdentity } from '~/types/workspace/collaborationMessagesContextView'

import type { AgentOrgExecutionViewIndex } from './agentOrgExecutionViewIndex'
type Message = AgentOrgCommunicationMessageDto

export const assertAgentOrgCommunicationMessagesCorrelated = (
  index: AgentOrgExecutionViewIndex,
  messages: readonly Message[],
): void => {
  for (const message of messages) {
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`AgentOrg communication message '${message.messageId}' is self-targeted.`)
    }
    index.requireAgent(message.senderAgentRunId)
    index.requireAgent(message.receiverAgentRunId)
  }
}

export const projectAgentOrgMessageIdentity = (
  index: AgentOrgExecutionViewIndex, agentRunId: string,
): CollaborationMessageMemberIdentity => {
  const agent = index.requireAgent(agentRunId)
  // F-03: one display-name rule for tab senders in every root.
  const common = { address: agent.address, label: memberDisplayName(agent.address) }
  return agent.delegation ? Object.freeze({ ...common, kind: 'delegated',
    hostRunId: agent.host.runId, executionRunId: agent.delegation.executionRunId })
    : Object.freeze({ ...common, kind: 'configured' })
}
