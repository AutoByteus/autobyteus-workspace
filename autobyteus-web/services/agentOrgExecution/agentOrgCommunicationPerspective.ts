import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { AgentOrgCommunicationMessageDto } from '@autobyteus/collaboration-stream-contracts'
import type { CollaborationMessageMemberIdentity } from '~/types/workspace/collaborationMessagesContextView'

import type { AgentOrgExecutionViewIndex } from './agentOrgExecutionViewIndex'
type Message = AgentOrgCommunicationMessageDto

/** An Org's message is between two agents: its own, or of the runs in its tree (SR-072, SR-084). */
export const assertAgentOrgCommunicationMessagesCorrelated = (messages: readonly Message[]): void => {
  for (const message of messages) {
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`AgentOrg communication message '${message.messageId}' is self-targeted.`)
    }
  }
}

export const projectAgentOrgMessageIdentity = (
  index: AgentOrgExecutionViewIndex, agentRunId: string,
): CollaborationMessageMemberIdentity => {
  const agent = index.requireAgent(agentRunId)
  // F-03: one display-name rule for tab senders in every root.
  return Object.freeze({ address: agent.address, label: memberDisplayName(agent.address), kind: 'configured' })
}
