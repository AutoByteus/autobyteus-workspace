import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import type { RunMetadataConfigPayload, RunModelConfigEditability } from '~/stores/runHistoryTypes'
import type { ExistingTeamModelConfigDraft } from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import type { ExistingAgentOrgModelConfigDraft } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'

export type ExistingRunModelConfigSchemaState = Readonly<{
  status: 'loading' | 'ready' | 'invalid' | 'unavailable'
  message: string | null
}>

export type ExistingRunModelConfigFieldError = Readonly<{
  path: string
  message: string
}>

export type ExistingAgentModelConfigDraft = Readonly<{
  kind: 'agent'
  runId: string
  isActive: boolean
  editability: RunModelConfigEditability
  metadata: RunMetadataConfigPayload
  draftSelection: ExistingRunModelSelection
}>

export type ExistingTeamRunModelConfigDraft = Readonly<{
  kind: 'team'
  teamRunId: string
  isActive: boolean
  editability: RunModelConfigEditability
  executionTree: TeamRunExecutionTreeDto
  planner: ExistingTeamModelConfigDraft
}>

export type ExistingAgentOrgRunModelConfigDraft = Readonly<{
  kind: 'agent_org'
  orgRunId: string
  isActive: boolean
  editability: RunModelConfigEditability
  executionTree: AgentOrgExecutionTree
  planner: ExistingAgentOrgModelConfigDraft
}>

export type ExistingRunModelConfigDraft = ExistingAgentModelConfigDraft | ExistingTeamRunModelConfigDraft | ExistingAgentOrgRunModelConfigDraft

export type ExistingRunModelSelection = Readonly<{
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
}>
export type ExistingRunModelOptions = Readonly<{
  currentModelIdentifier: string
  currentContextTokens: number | null
  replacements: readonly { llmModelIdentifier: string; contextTokens: number }[]
  unavailableReason: string | null
}>
export type ExistingRunModelOptionsState = Readonly<{
  status: 'loading' | 'ready' | 'unavailable'
  options: ExistingRunModelOptions | null
}>
