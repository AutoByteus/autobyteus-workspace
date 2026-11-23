import { projectAgentOrgReference } from '~/services/agentOrgExecution/agentOrgReferenceProjection'
import type {
  CollaborationMessageMemberIdentity,
  CollaborationMessagePerspectiveRow,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import {
  isOwnAgentList, useCollaborationParticipantMessagesStore, type ParticipantCounterpart, type ParticipantMessage, type ParticipantMessagesKey,
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

/**
 * The one link to a message's reference file (autobyteus-615): by the key its message list was loaded with, so the server
 * reads the same view (`collaborationParticipantMessages`' root kind and run ID) and finds the message whichever run's log
 * holds it.
 */
export const messageReferenceContentPath = (key: Pick<ParticipantMessagesKey, 'rootKind' | 'rootRunId'>, messageId: string, referenceId: string): string =>
  `collaboration-messages/${encodeURIComponent(key.rootKind)}/${encodeURIComponent(key.rootRunId)}/messages/${encodeURIComponent(messageId)}/references/${encodeURIComponent(referenceId)}/content`

const LOADED = Object.freeze({ state: 'loaded' as const, error: null })
const MORE_IDLE = Object.freeze({ state: 'idle' as const, error: null })

/**
 * A counterpart the root's tree does not hold, as the server (or a live message's parties) named it: an agent of a
 * delegated run that left the tree (autobyteus-469), of another local run, or on another node (with its node; autobyteus-565).
 * An agent whose address is unknown is named by its run ID.
 */
const counterpartIdentityOf = (counterparts: readonly ParticipantCounterpart[], agentRunId: string): CollaborationMessageMemberIdentity | null => {
  const counterpart = counterparts.find((candidate) => candidate.agentRunId === agentRunId)
  if (!counterpart) return null
  if (counterpart.kind === 'past') {
    return Object.freeze({ kind: 'past', address: counterpart.address as AgentTeamAddress, label: memberDisplayName(counterpart.address) })
  }
  const address = counterpart.address as AgentTeamAddress | null
  const label = address ? memberDisplayName(address) : counterpart.agentRunId
  return counterpart.kind === 'remote'
    ? Object.freeze({ kind: 'remote', address, label, nodeName: counterpart.nodeName })
    : Object.freeze({ kind: 'run', address, label })
}

/** An own agent's list shows every row (autobyteus-565): an agent nothing names is shown by its run ID. */
const unnamedIdentityOf = (agentRunId: string): CollaborationMessageMemberIdentity =>
  Object.freeze({ kind: 'run', address: null, label: agentRunId })

/**
 * The Team-tab part of a root's `CollaborationMessagesContextView` for one focused participant: its rows, its
 * load state, the request to load it and its older pages. A counterpart that is not in the root's tree is named from
 * the list's counterparts. A standalone run's own agent's list shows every row; any other list leaves out a row whose
 * other agent nothing names, as before (REQ-006). A participant that is a run on another node gets no request: its
 * messages stay on its node, and its list is empty (AR-004).
 */
export const participantMessagesView = (input: Readonly<{
  key: ParticipantMessagesKey
  isRemote: boolean
  identityOf(agentRunId: string): CollaborationMessageMemberIdentity | null
}>): Pick<CollaborationMessagesContextView, 'listMessages' | 'messagesStatus' | 'loadMessages' | 'hasMore' | 'moreStatus' | 'loadMore' | 'referenceContentPath'> => {
  const owner = useCollaborationParticipantMessagesStore()
  const ownList = isOwnAgentList(input.key)
  return {
    listMessages: () => {
      if (input.isRemote) return []
      const counterparts = owner.counterpartsOf(input.key)
      return projectParticipantMessageRows({
        messages: owner.messagesOf(input.key), focusedAgentRunId: input.key.agentRunId,
        identityOf: (agentRunId) => input.identityOf(agentRunId) ?? counterpartIdentityOf(counterparts, agentRunId)
          ?? (ownList ? unnamedIdentityOf(agentRunId) : null),
      })
    },
    messagesStatus: () => input.isRemote ? LOADED : owner.statusOf(input.key),
    loadMessages: () => { if (!input.isRemote) owner.load(input.key) },
    hasMore: () => !input.isRemote && owner.hasMoreOf(input.key),
    moreStatus: () => input.isRemote ? MORE_IDLE : owner.moreStatusOf(input.key),
    loadMore: () => { if (!input.isRemote) owner.loadMore(input.key) },
    referenceContentPath: (messageId: string, referenceId: string) => messageReferenceContentPath(input.key, messageId, referenceId),
  }
}
