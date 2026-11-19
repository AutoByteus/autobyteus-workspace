import {
  AgentRootExecutionViewDtoSchema,
  type AgentRunCollaborationViewDto,
} from '@autobyteus/collaboration-stream-contracts'
import { GetAgentRunCollaboration } from '~/graphql/queries/collaboratorQueries'
import { getApolloClient } from '~/utils/apolloClient'

/** The stored or live view of a standalone run's collaboration root; null when it has none. Never restores. */
export const readAgentRunCollaboration = async (runId: string): Promise<AgentRunCollaborationViewDto | null> => {
  const result = await getApolloClient().query<{ agentRunCollaboration: unknown }>({
    query: GetAgentRunCollaboration, variables: { runId: runId },
    fetchPolicy: 'network-only', context: { queryDeduplication: false },
  })
  if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
  const raw = result.data?.agentRunCollaboration
  if (!raw) return null
  const envelope = AgentRootExecutionViewDtoSchema.parse(raw)
  if (envelope.root_run_id !== runId) throw new Error('Agent collaboration root mismatch.')
  return envelope.root_agent
}
