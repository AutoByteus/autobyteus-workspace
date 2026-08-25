import type {
  AgentRuntimeKind,
  SkillAccessMode,
} from '~/types/agent/AgentRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import type { AgentTeamAddress } from './AgentTeamAddress'

export interface TeamWorkspaceSelection {
  workspaceId: string | null
  workspaceMetadata: WorkspaceMetadata | null
}

export interface TeamScopeRootConfig {
  runtimeKind: AgentRuntimeKind
  workspace: TeamWorkspaceSelection
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  skillAccessMode: SkillAccessMode
}

export interface TeamScopeConfigOverride {
  runtimeKind?: AgentRuntimeKind
  workspace?: TeamWorkspaceSelection
  llmModelIdentifier?: string
  autoExecuteTools?: boolean
  llmConfig?: Record<string, unknown> | null
}

export interface AgentConfigOverride {
  runtimeKind?: AgentRuntimeKind
  llmModelIdentifier?: string
  autoExecuteTools?: boolean
  llmConfig?: Record<string, unknown> | null
}

export interface ResolvedTeamRunLaunchConfig {
  runtimeKind: AgentRuntimeKind
  workspaceId: string | null
  workspaceMetadata: WorkspaceMetadata | null
  workspaceRootPath: string | null
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  skillAccessMode: SkillAccessMode
}

export interface TeamRunConfig {
  teamDefinitionId: string
  teamDefinitionName: string
  rootConfig: TeamScopeRootConfig
  teamOverrides: Record<AgentTeamAddress, TeamScopeConfigOverride>
  agentOverrides: Record<AgentTeamAddress, AgentConfigOverride>
  isLocked: boolean
}

export interface ResolvedTeamScopeView {
  address: AgentTeamAddress
  parentAddress: AgentTeamAddress | null
  displayName: string
  teamDefinitionId: string
  depth: number
  isCustomized: boolean
  override: Readonly<TeamScopeConfigOverride> | null
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
}

export interface ResolvedAgentLaunchView {
  address: AgentTeamAddress
  containingTeamAddress: AgentTeamAddress
  displayName: string
  agentDefinitionId: string
  override: Readonly<AgentConfigOverride> | null
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
}

interface TeamRunConfigurationViewBase {
  readonly teamDefinitionId: string
  readonly teamDefinitionName: string
  readonly root: ResolvedTeamScopeView
  readonly teamsByAddress: Readonly<Record<AgentTeamAddress, ResolvedTeamScopeView>>
  readonly agentsByAddress: Readonly<Record<AgentTeamAddress, ResolvedAgentLaunchView>>
}

export interface StoredTeamRunAgentNode {
  readonly kind: 'agent'
  readonly address: AgentTeamAddress
  readonly displayName: string
  readonly agentDefinitionId: string
}

export interface StoredTeamRunTeamNode {
  readonly kind: 'agent_team'
  readonly address: AgentTeamAddress
  readonly displayName: string
  readonly teamDefinitionId: string
  readonly coordinatorAddress: AgentTeamAddress
  readonly children: readonly StoredTeamRunMemberNode[]
}

export type StoredTeamRunMemberNode = StoredTeamRunAgentNode | StoredTeamRunTeamNode

export type EditableTeamRunConfigurationView = TeamRunConfigurationViewBase & Readonly<{
  source: 'EDITABLE_INTENT'
}>

export type StoredTeamRunConfigurationView = TeamRunConfigurationViewBase & Readonly<{
  source: 'STORED_SNAPSHOT'
  coordinatorAddress: AgentTeamAddress
  memberNodes: readonly StoredTeamRunMemberNode[]
}>

export type TeamRunConfigurationView =
  | EditableTeamRunConfigurationView
  | StoredTeamRunConfigurationView
