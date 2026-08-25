import type { AgentTeamAddress } from './AgentTeamAddress'
import type { TeamWorkspaceOperationState } from './TeamLaunchDraft'
import type {
  AgentConfigOverride,
  ResolvedTeamRunLaunchConfig,
  TeamRunConfig,
  TeamScopeConfigOverride,
} from './TeamRunConfig'
import type { TeamAgentDisplayFields, TeamScopeDisplayFields } from './TeamRunFormDisplay'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

export type EditableRuntimeCatalogOperationState = Readonly<{
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}>

export type EditableTeamScopeFormModel = TeamScopeDisplayFields & Readonly<{
  mode: 'editable'
  inheritedConfig: Readonly<ResolvedTeamRunLaunchConfig> | null
  override: Readonly<TeamScopeConfigOverride> | null
  workspaceSelection: Readonly<WorkspaceSelectionState>
  workspaceOperation: TeamWorkspaceOperationState
  runtimeCatalogState: EditableRuntimeCatalogOperationState
}>

export type EditableTeamFormAgentNode = TeamAgentDisplayFields & Readonly<{
  mode: 'editable'
  override: Readonly<AgentConfigOverride> | undefined
  baselineConfig: Readonly<ResolvedTeamRunLaunchConfig>
  runtimeCatalogState: EditableRuntimeCatalogOperationState
}>

export type EditableTeamFormTeamNode = Readonly<{
  mode: 'editable'
  kind: 'agent_team'
  address: AgentTeamAddress
  scope: EditableTeamScopeFormModel
  children: readonly EditableTeamFormMemberNode[]
}>

export type EditableTeamFormMemberNode = EditableTeamFormAgentNode | EditableTeamFormTeamNode

export type EditableTeamRunFormModel = Readonly<{
  mode: 'editable'
  definitionLabel: string
  config: Readonly<TeamRunConfig>
  root: EditableTeamScopeFormModel
  members: readonly EditableTeamFormMemberNode[]
  repairAddresses: readonly AgentTeamAddress[]
  isLocked: boolean
}>
