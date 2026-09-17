import type { AgentConfigOverride, TeamScopeConfigOverride } from './TeamRunConfig'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

/** Authorable new-run values only. Source runtime identity belongs to navigation. */
export type AgentOrgRunLaunchSeed = Readonly<{
  definitionId: string
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  workspaceSelection: WorkspaceSelectionState
  teamOverrides: Record<string, TeamScopeConfigOverride>
  agentOverrides: Record<string, AgentConfigOverride>
  teamWorkspaceSelections: Record<string, WorkspaceSelectionState>
}>
