import { agentOrgExecutionTreeDtoSchema } from '@autobyteus/collaboration-stream-contracts'
import { getApolloClient } from '~/utils/apolloClient'
import { AgentOrgRunModelConfig } from '~/graphql/queries/runModelOptionsQueries'
import type { RunModelConfigEditability } from '~/stores/runHistoryTypes'

export type AgentOrgRunModelConfigRead = Readonly<{
  orgRunId: string
  executionTree: ReturnType<typeof agentOrgExecutionTreeDtoSchema.parse>
  isActive: boolean
  editability: RunModelConfigEditability
}>

const parseRead = (raw: unknown): AgentOrgRunModelConfigRead => {
  if (!raw || typeof raw !== 'object') throw new Error('AgentOrg model configuration is unavailable.')
  const value = raw as Record<string, unknown>
  const editability = value.editability
  if (typeof value.orgRunId !== 'string' || !value.orgRunId.trim() || typeof value.isActive !== 'boolean'
      || !editability || typeof editability !== 'object') {
    throw new Error('AgentOrg model configuration is invalid.')
  }
  const editabilityValue = editability as Record<string, unknown>
  if (typeof editabilityValue.editable !== 'boolean'
      || !(typeof editabilityValue.reason === 'string' || editabilityValue.reason === null)) {
    throw new Error('AgentOrg model configuration editability is invalid.')
  }
  return {
    orgRunId: value.orgRunId,
    executionTree: agentOrgExecutionTreeDtoSchema.parse(value.executionTree),
    isActive: value.isActive,
    editability: { editable: editabilityValue.editable, reason: editabilityValue.reason },
  }
}

export const assertAgentOrgRunModelConfigIdentity = (orgRunId: string, value: AgentOrgRunModelConfigRead): void => {
  if (value.orgRunId !== orgRunId || value.executionTree.rootOrg.orgRunId !== orgRunId
    || (value.isActive && value.editability.editable)) throw new Error('AgentOrg model configuration identity/lifecycle mismatch.')
}

export const readAgentOrgRunModelConfig = async (orgRunId: string): Promise<AgentOrgRunModelConfigRead> => {
  const { data, errors } = await getApolloClient().query({ query: AgentOrgRunModelConfig,
    variables: { orgRunId }, fetchPolicy: 'network-only', context: { queryDeduplication: false } })
  if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '))
  const value = parseRead((data as Record<string, unknown> | null | undefined)?.getAgentOrgRunModelConfig)
  assertAgentOrgRunModelConfigIdentity(orgRunId, value)
  return value
}
