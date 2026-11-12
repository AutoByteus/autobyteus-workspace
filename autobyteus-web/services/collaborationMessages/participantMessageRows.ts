import { projectAgentOrgReference } from '~/services/agentOrgExecution/agentOrgReferenceProjection'
import type {
  CollaborationMessageMemberIdentity,
  CollaborationMessagePerspectiveRow,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import {
  useCollaborationParticipantMessagesStore, type ParticipantMessage, type ParticipantMessagesKey, type PastParticipant,
} from './collaborationParticipantMessages'

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

/** A counterpart the root's tree no longer holds, named by the address the server read from its run (autobyteus-469). */
const pastIdentityOf = (pastParticipants: readonly PastParticipant[], agentRunId: string): CollaborationMessageMemberIdentity | null => {
  const past = pastParticipants.find((participant) => participant.agentRunId === agentRunId)
  return past ? Object.freeze({ kind: 'past', address: past.address, label: memberDisplayName(past.address) }) : null
}

/**
 * The Team-tab part of a root's `CollaborationMessagesContextView` for one focused participant: its rows, its
 * load state and the request to load it. A counterpart that is not in the root's tree is named from the list's past
 * participants. A participant that is a run on another node gets no request: its messages stay on its node, and its
 * list is empty (AR-004).
 */
export const participantMessagesView = (input: Readonly<{
  key: ParticipantMessagesKey
  isRemote: boolean
  identityOf(agentRunId: string): CollaborationMessageMemberIdentity | null
}>): Pick<CollaborationMessagesContextView, 'listMessages' | 'messagesStatus' | 'loadMessages'> => {
  const owner = useCollaborationParticipantMessagesStore()
  return {
    listMessages: () => input.isRemote ? [] : projectParticipantMessageRows({
      messages: owner.messagesOf(input.key), focusedAgentRunId: input.key.agentRunId,
      identityOf: (agentRunId) => input.identityOf(agentRunId) ?? pastIdentityOf(owner.pastParticipantsOf(input.key), agentRunId),
    }),
    messagesStatus: () => input.isRemote ? LOADED : owner.statusOf(input.key),
    loadMessages: () => { if (!input.isRemote) owner.load(input.key) },
  }
}
