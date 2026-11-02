import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamReferenceFile } from '~/types/teamReferenceFile'

export type CollaborationMessageMemberIdentity = Readonly<{
  address: AgentTeamAddress
  label: string
}> & (Readonly<{ kind: 'configured' }> | Readonly<{
  /** A participant inside a delegated child (task Agent or task Team). */
  kind: 'delegated'
  hostRunId: string
  executionRunId: string
}>)

export interface CollaborationMessagePerspectiveRow {
  readonly messageId: string
  readonly senderAgentRunId: string
  readonly receiverAgentRunId: string
  readonly content: string
  readonly messageType: string
  readonly createdAt: string
  readonly referenceFiles: readonly TeamReferenceFile[]
  readonly direction: 'sent' | 'received'
  readonly counterpartAgentRunId: string
  readonly counterpart: CollaborationMessageMemberIdentity
}

export interface CollaborationMessagesContextView {
  readonly rootKind: 'agent_team' | 'agent_org' | 'agent'
  readonly rootRunId: string
  readonly focusedAgentRunId: string
  readonly focusedMemberAddress: AgentTeamAddress
  memberIdentityByAgentRunId(): Readonly<Record<string, CollaborationMessageMemberIdentity>>
  /** The focused participant's loaded messages, newest first; empty until they are loaded (autobyteus-358). */
  listMessages(): readonly CollaborationMessagePerspectiveRow[]
  /** Whether those messages are loading, loaded, or could not be read (with the reason). */
  messagesStatus(): Readonly<{ state: 'idle' | 'loading' | 'loaded' | 'error'; error: string | null }>
  /** Asks for those messages when they are shown; after a failure it tries again. */
  loadMessages(): void
  referenceContentPath(messageId: string, referenceId: string): string
}
