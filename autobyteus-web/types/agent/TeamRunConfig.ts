import type {
  AgentRuntimeKind,
  SkillAccessMode,
} from '~/types/agent/AgentRunConfig'
import type { WorkspaceReference } from '~/types/workspace/WorkspaceReference'

export interface MemberConfigOverride {
  agentDefinitionId: string
  runtimeKind?: AgentRuntimeKind
  llmModelIdentifier?: string
  autoExecuteTools?: boolean
  llmConfig?: Record<string, unknown> | null
}

export interface TeamRunConfig {
  teamDefinitionId: string
  teamDefinitionName: string
  runtimeKind: AgentRuntimeKind
  workspaceId: string | null
  workspaceReference: WorkspaceReference | null
  llmModelIdentifier: string
  llmConfig?: Record<string, unknown> | null
  autoExecuteTools: boolean
  skillAccessMode: SkillAccessMode
  /** Member overrides keyed by canonical member route key. */
  memberOverrides: Record<string, MemberConfigOverride>
  isLocked: boolean
}
