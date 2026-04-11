import { gql } from 'graphql-tag'

export const LIST_TEAM_RUN_MEMORY_SNAPSHOTS = gql`
  query ListTeamRunMemorySnapshots($search: String, $page: Int, $pageSize: Int) {
    listTeamRunMemorySnapshots(search: $search, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      totalPages
      entries {
        teamRunId
        teamDefinitionId
        teamDefinitionName
        lastUpdatedAt
        members {
          memberRouteKey
          memberName
          memberRunId
          lastUpdatedAt
          hasWorkingContext
          hasEpisodic
          hasSemantic
          hasRawTraces
          hasRawArchive
        }
      }
    }
  }
`

export const GET_TEAM_MEMBER_RUN_MEMORY_VIEW = gql`
  query GetTeamMemberRunMemoryView(
    $teamRunId: String!
    $memberRunId: String!
    $includeWorkingContext: Boolean
    $includeEpisodic: Boolean
    $includeSemantic: Boolean
    $includeRawTraces: Boolean
    $includeArchive: Boolean
    $rawTraceLimit: Int
  ) {
    getTeamMemberRunMemoryView(
      teamRunId: $teamRunId
      memberRunId: $memberRunId
      includeWorkingContext: $includeWorkingContext
      includeEpisodic: $includeEpisodic
      includeSemantic: $includeSemantic
      includeRawTraces: $includeRawTraces
      includeArchive: $includeArchive
      rawTraceLimit: $rawTraceLimit
    ) {
      runId
      workingContext {
        role
        content
        reasoning
        toolPayload
        ts
      }
      episodic
      semantic
      rawTraces {
        traceType
        content
        toolName
        toolCallId
        toolArgs
        toolResult
        toolError
        media
        turnId
        seq
        ts
      }
    }
  }
`
