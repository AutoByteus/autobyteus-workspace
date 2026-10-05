import { RootExecutionViewDtoSchema, type AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'
import { getApolloClient } from '~/utils/apolloClient'

/** Read-only, inactive-capable observation; never restores a root or publishes state. */
export const readAgentOrgRunInspection = async (orgRunId: string): Promise<AgentOrgExecutionViewDto> => {
  const result = await getApolloClient().query({ query: GetAgentOrgRunInspection,
    variables: { orgRunId }, fetchPolicy: 'network-only', context: { queryDeduplication: false } })
  if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
  const envelope = RootExecutionViewDtoSchema.parse(result.data?.getAgentOrgRunInspection)
  if (envelope.root_subject_kind !== 'agent_org' || envelope.root_run_id !== orgRunId) {
    throw new Error('AgentOrg inspection root mismatch.')
  }
  return envelope.root_org
}
