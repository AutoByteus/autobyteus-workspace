import { getApolloClient } from '~/utils/apolloClient'
import { UpdateStoppedAgentRunSelection } from '~/graphql/mutations/runHistoryMutations'
import { UpdateStoppedTeamRunModelConfigs } from '~/graphql/mutations/agentTeamRunMutations'
import type { RunModelConfigEditability } from '~/stores/runHistoryTypes'
import type { ExistingAgentRunSelection, ExistingRunModelConfigFieldError } from '~/types/agent/ExistingRunModelConfigDraft'
import type { ExistingTeamModelConfigPatch } from './existingTeamModelConfigDraft'

export type ExistingRunModelConfigMutationResult = Readonly<{
  success: boolean
  outcome: string
  message: string
  isActive: boolean
  editability: RunModelConfigEditability
  fieldErrors: readonly ExistingRunModelConfigFieldError[]
}>

export type AgentSelectionMutationResult = ExistingRunModelConfigMutationResult & Readonly<{
  canonicalSelection: ExistingAgentRunSelection | null
}>

export type TeamModelConfigMutationResult = ExistingRunModelConfigMutationResult & Readonly<{
  canonicalExecutionTree?: unknown | null
}>
const requiredResult = <T>(
  response: { data?: Record<string, T> | null; errors?: readonly { message: string }[] },
  field: string,
): T => {
  if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(', '))
  const result = response.data?.[field]
  if (!result) throw new Error('Model-setting update returned no result.')
  return result
}

export const updateStoppedAgentSelection = async (input: {
  agentRunId: string
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
}): Promise<AgentSelectionMutationResult> => {
  const response = await getApolloClient().mutate<Record<string, AgentSelectionMutationResult>>({
    mutation: UpdateStoppedAgentRunSelection,
    variables: { input },
  })
  return requiredResult(response, 'updateStoppedAgentRunSelection')
}

export const updateStoppedTeamModelConfigs = async (input: {
  teamRunId: string
  patches: readonly ExistingTeamModelConfigPatch[]
}): Promise<TeamModelConfigMutationResult> => {
  const response = await getApolloClient().mutate<Record<string, TeamModelConfigMutationResult>>({
    mutation: UpdateStoppedTeamRunModelConfigs,
    variables: { input },
  })
  return requiredResult(response, 'updateStoppedTeamRunModelConfigs')
}
