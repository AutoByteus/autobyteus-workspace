import type {
  AgentConfigOverride,
  TeamRunConfig,
  TeamScopeConfigOverride,
  TeamWorkspaceSelection,
} from './TeamRunConfig'
import type { AgentTeamAddress } from './AgentTeamAddress'
import type { ContextAttachment } from '~/types/conversation'

export type TeamLaunchDraftId = string & { readonly __teamLaunchDraftId: unique symbol }

export interface TeamLaunchPendingInput {
  readonly text: string
  readonly attachments: readonly ContextAttachment[]
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
  readonly focusedMemberAddress: AgentTeamAddress
  readonly pendingInputsByMemberAddress: Readonly<Record<AgentTeamAddress, TeamLaunchPendingInput>>
}

export const createTeamLaunchDraftId = (): TeamLaunchDraftId =>
  `team-draft-${crypto.randomUUID()}` as TeamLaunchDraftId
