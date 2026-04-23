import type {
  AgentRuntimeKind,
  SkillAccessMode,
} from '~/types/agent/AgentRunConfig'

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
  llmModelIdentifier: string
  llmConfig?: Record<string, unknown> | null
  autoExecuteTools: boolean
  skillAccessMode: SkillAccessMode
  memberOverrides: Record<string, MemberConfigOverride>
  isLocked: boolean
}
