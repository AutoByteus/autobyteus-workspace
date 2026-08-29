import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import type { RunMetadataConfigPayload, RunModelConfigEditability } from '~/stores/runHistoryTypes'
import type { ExistingTeamModelConfigDraft } from '~/services/runConfigEditing/existingTeamModelConfigDraft'

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
  canonicalLlmConfig: Record<string, unknown> | null
  draftLlmConfig: Record<string, unknown> | null
}>

export type ExistingTeamRunModelConfigDraft = Readonly<{
  kind: 'team'
  teamRunId: string
  isActive: boolean
  editability: RunModelConfigEditability
  executionTree: TeamRunExecutionTreeDto
  planner: ExistingTeamModelConfigDraft
}>

export type ExistingRunModelConfigDraft = ExistingAgentModelConfigDraft | ExistingTeamRunModelConfigDraft
