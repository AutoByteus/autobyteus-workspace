import { UpdateStoppedAgentOrgRunConfig } from '~/graphql/mutations/agentOrgRunMutations'
import type { ExistingRunModelConfigMutationResult } from './existingRunModelConfigMutationClient'
import type { ExistingAgentOrgModelConfigPatch } from './existingAgentOrgModelConfigDraft'
import type { TeamWorkspacePatch } from './existingAgentOrgWorkspaceDraft'
import { agentOrgExecutionTreeDtoSchema } from '@autobyteus/collaboration-stream-contracts'
import { getApolloClient } from '~/utils/apolloClient'
import { AgentOrgRunConfig } from '~/graphql/queries/runModelOptionsQueries'
import type { RunModelConfigEditability } from '~/stores/runHistoryTypes'

export type AgentOrgRunConfigRead = Readonly<{
  orgRunId: string
  executionTree: ReturnType<typeof agentOrgExecutionTreeDtoSchema.parse>
  isActive: boolean
  editability: RunModelConfigEditability
}>

const parseRead = (raw: unknown): AgentOrgRunConfigRead => {
  if (!raw || typeof raw !== 'object') throw new Error('AgentOrg configuration is unavailable.')
  const value = raw as Record<string, unknown>
  const editability = value.editability
  if (typeof value.orgRunId !== 'string' || !value.orgRunId.trim() || typeof value.isActive !== 'boolean'
      || !editability || typeof editability !== 'object') {
    throw new Error('AgentOrg configuration is invalid.')
  }
  const editabilityValue = editability as Record<string, unknown>
  if (typeof editabilityValue.editable !== 'boolean'
      || !(typeof editabilityValue.reason === 'string' || editabilityValue.reason === null)) {
    throw new Error('AgentOrg configuration editability is invalid.')
  }
  return {
    orgRunId: value.orgRunId,
    executionTree: agentOrgExecutionTreeDtoSchema.parse(value.executionTree),
    isActive: value.isActive,
    editability: { editable: editabilityValue.editable, reason: editabilityValue.reason },
  }
}

export const assertAgentOrgRunConfigIdentity = (orgRunId: string, value: AgentOrgRunConfigRead): void => {
  if (value.orgRunId !== orgRunId || value.executionTree.rootOrg.orgRunId !== orgRunId
    || (value.isActive && value.editability.editable)) throw new Error('AgentOrg configuration identity/lifecycle mismatch.')
}

export const readAgentOrgRunConfig = async (orgRunId: string): Promise<AgentOrgRunConfigRead> => {
  const { data, errors } = await getApolloClient().query({ query: AgentOrgRunConfig,
    variables: { orgRunId }, fetchPolicy: 'network-only', context: { queryDeduplication: false } })
  if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '))
  const value = parseRead((data as Record<string, unknown> | null | undefined)?.getAgentOrgRunConfig)
  assertAgentOrgRunConfigIdentity(orgRunId, value)
  return value
}

export type AgentOrgRunConfigMutationResult = ExistingRunModelConfigMutationResult & Readonly<{
  canonicalExecutionTree?: unknown | null
}>

export const updateStoppedAgentOrgRunConfig = async (input: {
  orgRunId: string
  modelPatches: readonly ExistingAgentOrgModelConfigPatch[]
  teamWorkspacePatches: readonly TeamWorkspacePatch[]
}): Promise<AgentOrgRunConfigMutationResult> => {
  type RawAgentOrgResult = ExistingRunModelConfigMutationResult & { canonical?: unknown | null }
  const response = await getApolloClient().mutate<Record<string, RawAgentOrgResult>>({
    mutation: UpdateStoppedAgentOrgRunConfig,
    variables: { input },
  })
  if (response.errors?.length) throw new Error(response.errors.map(error => error.message).join(', '))
  const result = response.data?.updateStoppedAgentOrgRunConfig
  if (!result) throw new Error('Org configuration update returned no result.')
  if (result.canonical) assertAgentOrgRunConfigIdentity(input.orgRunId, parseRead({ ...result, orgRunId: input.orgRunId, executionTree: result.canonical }))
  return { ...result, canonicalExecutionTree: result.canonical }
}
