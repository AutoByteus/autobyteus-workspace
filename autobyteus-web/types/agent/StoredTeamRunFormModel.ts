import type { AgentTeamAddress } from './AgentTeamAddress'
import type { TeamAgentDisplayFields, TeamScopeDisplayFields } from './TeamRunFormDisplay'

export type StoredWorkspaceDisplay = Readonly<{
  workspaceId: string | null
  displayName: string
  rootPath: string
  availability: 'available' | 'historical-only' | 'none'
}>

export type StoredTeamScopeFormModel = TeamScopeDisplayFields & Readonly<{
  mode: 'stored'
  storedWorkspace: StoredWorkspaceDisplay | null
}>

export type StoredTeamFormAgentNode = TeamAgentDisplayFields & Readonly<{
  mode: 'stored'
  storedWorkspace: StoredWorkspaceDisplay | null
}>

export type StoredTeamFormTeamNode = Readonly<{
  mode: 'stored'
  kind: 'agent_team'
  address: AgentTeamAddress
  scope: StoredTeamScopeFormModel
  children: readonly StoredTeamFormMemberNode[]
}>

export type StoredTeamFormMemberNode = StoredTeamFormAgentNode | StoredTeamFormTeamNode

export type StoredTeamRunFormModel = Readonly<{
  mode: 'stored'
  definitionLabel: string
  root: StoredTeamScopeFormModel
  members: readonly StoredTeamFormMemberNode[]
}>
