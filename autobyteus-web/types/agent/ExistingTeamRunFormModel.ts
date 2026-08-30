import type { AgentTeamAddress } from './AgentTeamAddress'
import type { TeamAgentDisplayFields, TeamScopeDisplayFields } from './TeamRunFormDisplay'

export type ExistingWorkspaceDisplay = Readonly<{
  workspaceId: string | null
  displayName: string
  rootPath: string
  availability: 'available' | 'historical-only' | 'none'
}>

export type ExistingTeamScopeFormModel = TeamScopeDisplayFields & Readonly<{
  mode: 'existing'
  storedWorkspace: ExistingWorkspaceDisplay | null
  directlyEdited: boolean
}>

export type ExistingTeamFormAgentNode = TeamAgentDisplayFields & Readonly<{
  mode: 'existing'
  storedWorkspace: ExistingWorkspaceDisplay | null
  directlyEdited: boolean
}>

export type ExistingTeamFormTeamNode = Readonly<{
  mode: 'existing'
  kind: 'agent_team'
  address: AgentTeamAddress
  scope: ExistingTeamScopeFormModel
  children: readonly ExistingTeamFormMemberNode[]
}>

export type ExistingTeamFormMemberNode = ExistingTeamFormAgentNode | ExistingTeamFormTeamNode

export type ExistingTeamRunFormModel = Readonly<{
  mode: 'existing'
  definitionLabel: string
  root: ExistingTeamScopeFormModel
  members: readonly ExistingTeamFormMemberNode[]
  isActive: boolean
  modelConfigEditable: boolean
  modelConfigReason: string | null
  saving: boolean
}>
