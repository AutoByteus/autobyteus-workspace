import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress'
import type {
  CollaborationMessageMemberIdentity,
  CollaborationMessagePerspectiveRow,
} from '~/types/workspace/collaborationMessagesContextView'
import { projectAgentOrgReference } from './agentOrgReferenceProjection'

import type { AgentOrgExecutionViewIndex } from './agentOrgExecutionViewIndex'
type Message = AgentOrgExecutionViewDto['communication_messages']['messages'][number]

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

export const projectAgentOrgCommunicationPerspective = (input: Readonly<{
  index: AgentOrgExecutionViewIndex
  messages: readonly Message[]
  focusedAgentRunId: string
}>): readonly CollaborationMessagePerspectiveRow[] => {
  assertAgentOrgCommunicationMessagesCorrelated(input.index, input.messages)
  input.index.requireAgent(input.focusedAgentRunId)
  return input.messages.flatMap((message): CollaborationMessagePerspectiveRow[] => {
    const sent = message.senderAgentRunId === input.focusedAgentRunId
    const received = message.receiverAgentRunId === input.focusedAgentRunId
    if (!sent && !received) return []
    const counterpartAgentRunId = sent ? message.receiverAgentRunId : message.senderAgentRunId
    return [Object.freeze({
      messageId: message.messageId,
      senderAgentRunId: message.senderAgentRunId,
      receiverAgentRunId: message.receiverAgentRunId,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      referenceFiles: Object.freeze(message.referenceFiles.map((filePath) =>
        projectAgentOrgReference(message.messageId, filePath, message.createdAt))),
      direction: sent ? 'sent' : 'received',
      counterpartAgentRunId,
      counterpart: projectAgentOrgMessageIdentity(input.index, counterpartAgentRunId),
    })]
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt)
    || left.messageId.localeCompare(right.messageId))
}

export const projectAgentOrgMessageIdentity = (
  index: AgentOrgExecutionViewIndex, agentRunId: string,
): CollaborationMessageMemberIdentity => {
  const agent = index.requireAgent(agentRunId)
  const common = { address: agent.address, label: memberAddressBasename(agent.address) }
  return agent.task ? Object.freeze({ ...common, kind: 'task', taskId: agent.task.taskId,
    hostRunId: agent.host.runId, executionRunId: agent.task.executionRunId })
    : Object.freeze({ ...common, kind: 'configured' })
}
