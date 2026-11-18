import { gql } from 'graphql-tag'
import {
  collaborationParticipantMessagesDtoSchema,
  type CollaborationParticipantMessagesDto,
  type CollaborationRootKind,
} from '@autobyteus/collaboration-stream-contracts'
import { getApolloClient } from '~/utils/apolloClient'

export const CollaborationParticipantMessagesQuery = gql`
  query CollaborationParticipantMessages($rootKind: String!, $rootRunId: String!, $agentRunId: String!) {
    collaborationParticipantMessages(rootKind: $rootKind, rootRunId: $rootRunId, agentRunId: $agentRunId)
  }
`

/**
 * One participant's stored messages of one root (autobyteus-358), with the agents of delegated runs that left the tree
 * that those messages name (autobyteus-469); a damaged log fails with the server's reason.
 */
export const fetchParticipantMessages = async (key: Readonly<{
  rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string
}>): Promise<CollaborationParticipantMessagesDto> => {
  const response = await getApolloClient().query<{ collaborationParticipantMessages: unknown }>({
    query: CollaborationParticipantMessagesQuery,
    variables: key,
    fetchPolicy: 'network-only',
    context: { queryDeduplication: false },
  })
  if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(', '))
  return collaborationParticipantMessagesDtoSchema.parse(response.data?.collaborationParticipantMessages)
}
