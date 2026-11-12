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

/** The stored or active Agent-root view of a standalone run; null when it has no delegated copies. */
export const GetAgentRunCollaboration = gql`
  query GetAgentRunCollaboration($runId: String!) {
    agentRunCollaboration(runId: $runId)
  }
`

/**
 * The history poll of listed runs of every kind (autobyteus-461 SR-055): each run's activity and the runs on this node it
 * delegated to that its view shows, each by its identity with its agents' statuses. Never the view; never restores.
 */
export const GetRunCollaborationStatuses = gql`
  query GetRunCollaborationStatuses($runs: [ListedRunInput!]!) {
    runCollaborationStatuses(runs: $runs)
  }
`

/** A child of a standalone run on a peer node: its stored state, read from its node through the run (autobyteus-278). */
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
