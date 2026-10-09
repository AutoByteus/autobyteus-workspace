import { gql } from 'graphql-tag'

/**
 * `@` menu options for a live run's root, from the server's one candidate policy. An Agent root
 * answers for its focused agent (`focusedAgentRunId`, required there); Team and Org roots per root.
 */
export const GetCollaboratorMentionCandidates = gql`
  query GetCollaboratorMentionCandidates($rootSubjectKind: String!, $rootRunId: String!, $focusedAgentRunId: String) {
    collaboratorMentionCandidates(rootSubjectKind: $rootSubjectKind, rootRunId: $rootRunId, focusedAgentRunId: $focusedAgentRunId) {
      availability
      candidates {
        kind
        definitionId
        name
        description
        memberCount
        coordinatorName
      }
    }
  }
`

/** The stored or active Agent-root view of a standalone run; null when it has no collaborators. */
export const GetAgentRunCollaboration = gql`
  query GetAgentRunCollaboration($runId: String!) {
    agentRunCollaboration(runId: $runId)
  }
`

export const GetAgentRunCollaborationMemberProjection = gql`
  query GetAgentRunCollaborationMemberProjection($hostRunId: String!, $memberAddress: String!, $agentRunId: String!) {
    agentRunCollaborationMemberProjection(hostRunId: $hostRunId, memberAddress: $memberAddress, agentRunId: $agentRunId) {
      agentRunId
      memberAddress
      conversation
      activities
      summary
      lastActivityAt
      hasEarlierActiveTraceEvents
    }
  }
`
