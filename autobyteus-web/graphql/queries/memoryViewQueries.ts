import { gql } from 'graphql-tag'

export const GET_AGENT_RUN_MEMORY_VIEW = gql`
  query GetAgentRunMemoryView(
    $runId: String!
    $source: MemoryExplorerSourceInput
    $includeWorkingContext: Boolean
    $includeEpisodic: Boolean
    $includeSemantic: Boolean
    $includeRawTraces: Boolean
    $includeArchive: Boolean
    $rawTraceLimit: Int
  ) {
    getAgentRunMemoryView(
      runId: $runId
      source: $source
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

export const GET_TEAM_MEMBER_RUN_MEMORY_VIEW = gql`
  query GetTeamMemberRunMemoryView(
    $teamRunId: String!
    $memberRunId: String!
    $source: MemoryExplorerSourceInput
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
      source: $source
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
