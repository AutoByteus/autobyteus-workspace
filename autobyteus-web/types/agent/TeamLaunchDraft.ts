import type {
  AgentConfigOverride,
  TeamRunConfig,
  TeamScopeConfigOverride,
  TeamWorkspaceSelection,
} from './TeamRunConfig'
import type { AgentTeamAddress } from './AgentTeamAddress'
import type { ContextAttachment } from '~/types/conversation'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

export type TeamLaunchDraftId = string & { readonly __teamLaunchDraftId: unique symbol }

export interface TeamLaunchPendingInput {
  readonly text: string
  readonly attachments: readonly ContextAttachment[]
}

export type TeamWorkspaceOperationStatus = 'idle' | 'loading' | 'error'

export interface TeamWorkspaceOperationState {
  readonly status: TeamWorkspaceOperationStatus
  readonly error: string | null
}

export interface TeamWorkspaceAuthoringState {
  readonly selectionMode: WorkspaceSelectionState['mode']
  readonly newWorkspacePath: string
  readonly operation: TeamWorkspaceOperationState
}

export interface TeamWorkspaceAuthoringView {
  readonly selection: Readonly<WorkspaceSelectionState>
  readonly operation: TeamWorkspaceOperationState
}

export type TeamWorkspaceAuthoringCommand = Readonly<{
  kind: 'set_selection'
  draftId: TeamLaunchDraftId
  teamAddress: AgentTeamAddress
  selection: Readonly<WorkspaceSelectionState>
}>

export interface TeamLaunchTopologySubject {
  readonly address: AgentTeamAddress
  readonly kind: 'team' | 'agent'
  readonly definitionId: string
}

export interface TeamWorkspacePreparationRequest {
  readonly rootPath: string
  readonly teamAddresses: readonly AgentTeamAddress[]
}

export interface TeamWorkspacePreparationPlan {
  readonly draftId: TeamLaunchDraftId
  readonly topologyFingerprint: string
  readonly topologySubjects: readonly TeamLaunchTopologySubject[]
  readonly requests: readonly TeamWorkspacePreparationRequest[]
}

export type TeamLaunchConfigEdit =
  | Readonly<{ kind: 'set_root_workspace'; workspace: TeamWorkspaceSelection }>
  | Readonly<{ kind: 'set_root_runtime'; runtimeKind: string }>
  | Readonly<{ kind: 'set_root_model'; llmModelIdentifier: string }>
  | Readonly<{ kind: 'set_root_llm_config'; llmConfig: Record<string, unknown> | null }>
  | Readonly<{ kind: 'set_root_auto_execute_tools'; autoExecuteTools: boolean }>
  | Readonly<{
      kind: 'set_team_override'
      teamAddress: AgentTeamAddress
      override: TeamScopeConfigOverride | null
    }>
  | Readonly<{ kind: 'reset_team_override'; teamAddress: AgentTeamAddress }>
  | Readonly<{
      kind: 'set_agent_override'
      agentAddress: AgentTeamAddress
      override: AgentConfigOverride | null
    }>

export interface TeamLaunchDraft {
  readonly draftId: TeamLaunchDraftId
  readonly config: Readonly<TeamRunConfig>
  readonly teamWorkspaceAuthoringByTeamAddress: Readonly<Partial<Record<AgentTeamAddress, TeamWorkspaceAuthoringState>>>
  readonly focusedMemberAddress: AgentTeamAddress
  readonly pendingInputsByMemberAddress: Readonly<Record<AgentTeamAddress, TeamLaunchPendingInput>>
}

export class TeamLaunchRepairRequiredError extends Error {
  readonly code = 'TEAM_LAUNCH_REPAIR_REQUIRED'
  readonly addresses: readonly AgentTeamAddress[]

  constructor(addresses: readonly AgentTeamAddress[], duringWorkspacePreparation = false) {
    super(duringWorkspacePreparation
      ? `Team topology changed during workspace preparation for ${addresses.join(', ')}. Review the repaired configuration and retry.`
      : `Team topology changed. Removed stale launch settings for ${addresses.join(', ')}. Review the repaired configuration and retry.`)
    this.name = 'TeamLaunchRepairRequiredError'
    this.addresses = [...addresses]
  }
}

export const isTeamLaunchRepairRequiredError = (error: unknown): error is TeamLaunchRepairRequiredError =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'TEAM_LAUNCH_REPAIR_REQUIRED'

export const createTeamLaunchDraftId = (): TeamLaunchDraftId =>
  `team-draft-${crypto.randomUUID()}` as TeamLaunchDraftId
