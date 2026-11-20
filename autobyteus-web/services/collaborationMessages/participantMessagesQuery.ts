import { gql } from 'graphql-tag'
import {
  collaborationParticipantMessagesDtoSchema,
  type CollaborationParticipantMessagesCursor,
  type CollaborationParticipantMessagesDto,
  type CollaborationRootKind,
} from '@autobyteus/collaboration-stream-contracts'
import { getApolloClient } from '~/utils/apolloClient'

export const CollaborationParticipantMessagesQuery = gql`
  query CollaborationParticipantMessages($rootKind: String!, $rootRunId: String!, $agentRunId: String!, $before: JSON) {
    collaborationParticipantMessages(rootKind: $rootKind, rootRunId: $rootRunId, agentRunId: $agentRunId, before: $before)
  }
`

/**
 * One page of one participant's stored messages of one root (autobyteus-358, autobyteus-565): the newest 50, or the 50
 * after `before` (the last message of the page before); with the other agents of the page its root's tree does not name
 * (autobyteus-469 past participants, other runs, other nodes) and whether older ones follow. A damaged log fails with
 * the server's reason.
 */
export const fetchParticipantMessages = async (key: Readonly<{
  rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string
}>, before: CollaborationParticipantMessagesCursor | null): Promise<CollaborationParticipantMessagesDto> => {
  const response = await getApolloClient().query<{ collaborationParticipantMessages: unknown }>({
    query: CollaborationParticipantMessagesQuery,
    variables: { rootKind: key.rootKind, rootRunId: key.rootRunId, agentRunId: key.agentRunId, before },
    fetchPolicy: 'network-only',
    context: { queryDeduplication: false },
  })
  if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(', '))
  return collaborationParticipantMessagesDtoSchema.parse(response.data?.collaborationParticipantMessages)
}
