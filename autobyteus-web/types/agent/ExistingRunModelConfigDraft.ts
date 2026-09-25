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

export type ExistingRunModelSelection = Readonly<{
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
}>
export type ExistingRunModelOptions = Readonly<{
  currentModelIdentifier: string
  currentModel: ExistingRunModelChoice | null
  replacements: readonly ExistingRunModelChoice[]
  unavailableReason: string | null
}>
export type ExistingRunModelChoice = Readonly<{
  llmModelIdentifier: string
  providerName: string
  displayName: string
  canonicalName: string
  description: string | null
  configSchema: Record<string, unknown> | null
  recommended: boolean
}>
export type ExistingRunModelOptionsState = Readonly<{
  status: 'loading' | 'ready' | 'unavailable'
  options: ExistingRunModelOptions | null
}>
