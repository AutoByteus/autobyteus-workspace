import { getApolloClient } from '~/utils/apolloClient'
import { UpdateStoppedAgentRunModelConfig } from '~/graphql/mutations/runHistoryMutations'
import { UpdateStoppedTeamRunModelConfigs } from '~/graphql/mutations/agentTeamRunMutations'
import { UpdateStoppedAgentOrgRunModelConfigs } from '~/graphql/mutations/agentOrgRunMutations'
import type { RunModelConfigEditability } from '~/stores/runHistoryTypes'
import type { ExistingRunModelConfigFieldError, ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import type { ExistingTeamModelConfigPatch } from './existingTeamModelConfigDraft'
import type { ExistingAgentOrgModelConfigPatch } from './existingAgentOrgModelConfigDraft'

export type ExistingRunModelConfigMutationResult = Readonly<{
  success: boolean
  outcome: string
  message: string
  isActive: boolean
  editability: RunModelConfigEditability
  fieldErrors: readonly ExistingRunModelConfigFieldError[]
}>

export type AgentModelConfigMutationResult = ExistingRunModelConfigMutationResult & Readonly<{
  canonicalSelection: ExistingRunModelSelection | null
}>

export type TeamModelConfigMutationResult = ExistingRunModelConfigMutationResult & Readonly<{
  canonicalExecutionTree?: unknown | null
}>
export type AgentOrgModelConfigMutationResult = ExistingRunModelConfigMutationResult & Readonly<{
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

export const updateStoppedAgentModelConfig = async (input: {
  agentRunId: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
}): Promise<AgentModelConfigMutationResult> => {
  const response = await getApolloClient().mutate<Record<string, AgentModelConfigMutationResult>>({
    mutation: UpdateStoppedAgentRunModelConfig,
    variables: { input },
  })
  return requiredResult(response, 'updateStoppedAgentRunModelConfig')
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

export const updateStoppedAgentOrgRunModelConfigs = async (input: {
  orgRunId: string
  patches: readonly ExistingAgentOrgModelConfigPatch[]
}): Promise<AgentOrgModelConfigMutationResult> => {
  type RawAgentOrgResult = ExistingRunModelConfigMutationResult & { canonical?: unknown | null }
  const response = await getApolloClient().mutate<Record<string, RawAgentOrgResult>>({
    mutation: UpdateStoppedAgentOrgRunModelConfigs,
    variables: { input },
  })
  const result = requiredResult<RawAgentOrgResult>(response, 'updateStoppedAgentOrgRunModelConfigs')
  return { ...result, canonicalExecutionTree: result.canonical }
}
