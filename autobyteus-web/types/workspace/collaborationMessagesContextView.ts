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

export interface CollaborationMessagesPerspective {
  readonly messages: readonly CollaborationMessagePerspectiveRow[]
}

export interface CollaborationMessagesContextView {
  readonly rootKind: 'agent_team' | 'agent_org' | 'agent'
  readonly rootRunId: string
  readonly focusedAgentRunId: string
  readonly focusedMemberAddress: AgentTeamAddress
  memberIdentityByAgentRunId(): Readonly<Record<string, CollaborationMessageMemberIdentity>>
  listMessages(): readonly CollaborationMessagePerspectiveRow[]
  referenceContentPath(messageId: string, referenceId: string): string
}
