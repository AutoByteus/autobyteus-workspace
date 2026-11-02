import { projectAgentOrgReference } from '~/services/agentOrgExecution/agentOrgReferenceProjection'
import type {
  CollaborationMessageMemberIdentity,
  CollaborationMessagePerspectiveRow,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView'
import { useCollaborationParticipantMessagesStore, type ParticipantMessage, type ParticipantMessagesKey } from './collaborationParticipantMessages'

/**
 * One participant's loaded messages as Team-tab rows, newest first (then by ID), seen from that participant. Every
 * root kind uses it; the root supplies who each counterpart is (null: not shown).
 */
export const projectParticipantMessageRows = (input: Readonly<{
  messages: readonly ParticipantMessage[]
  focusedAgentRunId: string
  identityOf(agentRunId: string): CollaborationMessageMemberIdentity | null
}>): readonly CollaborationMessagePerspectiveRow[] => input.messages.flatMap((message): CollaborationMessagePerspectiveRow[] => {
  const sent = message.senderAgentRunId === input.focusedAgentRunId
  if (!sent && message.receiverAgentRunId !== input.focusedAgentRunId) return []
  const counterpartAgentRunId = sent ? message.receiverAgentRunId : message.senderAgentRunId
  const counterpart = input.identityOf(counterpartAgentRunId)
  if (!counterpart) return []
  return [Object.freeze({
    messageId: message.messageId, senderAgentRunId: message.senderAgentRunId, receiverAgentRunId: message.receiverAgentRunId,
    content: message.content, messageType: message.messageType, createdAt: message.createdAt,
    referenceFiles: Object.freeze(message.referenceFiles.map((filePath) => projectAgentOrgReference(message.messageId, filePath, message.createdAt))),
    direction: sent ? 'sent' : 'received', counterpartAgentRunId, counterpart,
  })]
}).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId))

const LOADED = Object.freeze({ state: 'loaded' as const, error: null })

/**
 * The Team-tab part of a root's `CollaborationMessagesContextView` for one focused participant: its rows, its
 * load state and the request to load it. A participant that is a run on another node gets no request: its
 * messages stay on its node, and its list is empty (AR-004).
 */
export const participantMessagesView = (input: Readonly<{
  key: ParticipantMessagesKey
  isRemote: boolean
  identityOf(agentRunId: string): CollaborationMessageMemberIdentity | null
}>): Pick<CollaborationMessagesContextView, 'listMessages' | 'messagesStatus' | 'loadMessages'> => {
  const owner = useCollaborationParticipantMessagesStore()
  return {
    listMessages: () => input.isRemote ? [] : projectParticipantMessageRows({
      messages: owner.messagesOf(input.key), focusedAgentRunId: input.key.agentRunId, identityOf: input.identityOf,
    }),
    messagesStatus: () => input.isRemote ? LOADED : owner.statusOf(input.key),
    loadMessages: () => { if (!input.isRemote) owner.load(input.key) },
  }
}
