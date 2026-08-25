import type { AgentTeamAddress } from './AgentTeamAddress'
import type { TeamWorkspaceOperationState } from './TeamLaunchDraft'
import type {
  AgentConfigOverride,
  ResolvedTeamRunLaunchConfig,
  TeamRunConfig,
  TeamScopeConfigOverride,
} from './TeamRunConfig'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

export type TeamRunFormRuntimeCatalogState = Readonly<{
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}>

export type StoredWorkspaceDisplay = Readonly<{
  workspaceId: string | null
  displayName: string
  rootPath: string
  availability: 'available' | 'historical-only' | 'none'
}>

export type TeamScopeFormModel = Readonly<{
  address: AgentTeamAddress
  displayName: string
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
  workspaceSelection: Readonly<WorkspaceSelectionState>
  inheritedConfig: Readonly<ResolvedTeamRunLaunchConfig> | null
  override: Readonly<TeamScopeConfigOverride> | null
  isCustomized: boolean
  workspaceOperation: TeamWorkspaceOperationState
  runtimeCatalogState: TeamRunFormRuntimeCatalogState
  storedWorkspace: StoredWorkspaceDisplay | null
}>

export type EditableTeamFormAgentNode = Readonly<{
  mode: 'editable'
  kind: 'agent'
  address: AgentTeamAddress
  displayName: string
  isCoordinator: boolean
  override: Readonly<AgentConfigOverride> | undefined
  baselineConfig: Readonly<ResolvedTeamRunLaunchConfig>
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
  runtimeCatalogState: TeamRunFormRuntimeCatalogState
}>

export type StoredTeamFormAgentNode = Readonly<{
  mode: 'stored'
  kind: 'agent'
  address: AgentTeamAddress
  displayName: string
  isCoordinator: boolean
  isCustomized: boolean
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
  storedWorkspace: StoredWorkspaceDisplay | null
  runtimeCatalogState: TeamRunFormRuntimeCatalogState
}>

export type EditableTeamFormTeamNode = Readonly<{
  mode: 'editable'
  kind: 'agent_team'
  address: AgentTeamAddress
  scope: TeamScopeFormModel
  children: readonly EditableTeamFormMemberNode[]
}>

export type StoredTeamFormTeamNode = Readonly<{
  mode: 'stored'
  kind: 'agent_team'
  address: AgentTeamAddress
  scope: TeamScopeFormModel
  children: readonly StoredTeamFormMemberNode[]
}>

export type EditableTeamFormMemberNode = EditableTeamFormAgentNode | EditableTeamFormTeamNode
export type StoredTeamFormMemberNode = StoredTeamFormAgentNode | StoredTeamFormTeamNode
export type TeamRunFormMemberNode = EditableTeamFormMemberNode | StoredTeamFormMemberNode

export type EditableTeamRunFormModel = Readonly<{
  mode: 'editable'
  definitionLabel: string
  config: Readonly<TeamRunConfig>
  root: TeamScopeFormModel
  members: readonly EditableTeamFormMemberNode[]
  repairAddresses: readonly AgentTeamAddress[]
  isLocked: boolean
}>

export type StoredTeamRunFormModel = Readonly<{
  mode: 'stored'
  definitionLabel: string
  root: TeamScopeFormModel
  members: readonly StoredTeamFormMemberNode[]
  repairAddresses: readonly []
  isLocked: true
}>

export type TeamRunFormModel = EditableTeamRunFormModel | StoredTeamRunFormModel
