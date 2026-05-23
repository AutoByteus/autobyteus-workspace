import type {
  AgentRuntimeKind,
  SkillAccessMode,
} from '~/types/agent/AgentRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'

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
  workspaceMetadata: WorkspaceMetadata | null
  llmModelIdentifier: string
  llmConfig?: Record<string, unknown> | null
  autoExecuteTools: boolean
  skillAccessMode: SkillAccessMode
  /** Member overrides keyed by canonical member route key. */
  memberOverrides: Record<string, MemberConfigOverride>
  isLocked: boolean
}
