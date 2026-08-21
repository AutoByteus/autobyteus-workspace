import { gql } from 'graphql-tag'

export const GET_AGENT_RUN_MEMORY_VIEW = gql`
  query GetAgentRunMemoryView(
    $runId: String!
    $source: MemoryExplorerSourceInput
    $includeWorkingContext: Boolean
    $includeEpisodic: Boolean
    $includeSemantic: Boolean
    $includeRawTraces: Boolean
    $includeRawTraceFiles: Boolean
    $includeArchive: Boolean
    $rawTraceLimit: Int
    $rawTraceFileName: String
  ) {
    getAgentRunMemoryView(
      runId: $runId
      source: $source
      includeWorkingContext: $includeWorkingContext
      includeEpisodic: $includeEpisodic
      includeSemantic: $includeSemantic
      includeRawTraces: $includeRawTraces
      includeRawTraceFiles: $includeRawTraceFiles
      includeArchive: $includeArchive
      rawTraceLimit: $rawTraceLimit
      rawTraceFileName: $rawTraceFileName
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
      rawTraceFiles {
        fileName
        kind
        recordCount
        segmentIndex
        firstTimestamp
        lastTimestamp
      }
      selectedRawTraceFileName
      rawTraces {
        scope
        id
        traceType
        sourceEvent
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
    $agentRunId: String!
    $source: MemoryExplorerSourceInput
    $includeWorkingContext: Boolean
    $includeEpisodic: Boolean
    $includeSemantic: Boolean
    $includeRawTraces: Boolean
    $includeRawTraceFiles: Boolean
    $includeArchive: Boolean
    $rawTraceLimit: Int
    $rawTraceFileName: String
  ) {
    getTeamMemberRunMemoryView(
      teamRunId: $teamRunId
      agentRunId: $agentRunId
      source: $source
      includeWorkingContext: $includeWorkingContext
      includeEpisodic: $includeEpisodic
      includeSemantic: $includeSemantic
      includeRawTraces: $includeRawTraces
      includeRawTraceFiles: $includeRawTraceFiles
      includeArchive: $includeArchive
      rawTraceLimit: $rawTraceLimit
      rawTraceFileName: $rawTraceFileName
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
      rawTraceFiles {
        fileName
        kind
        recordCount
        segmentIndex
        firstTimestamp
        lastTimestamp
      }
      selectedRawTraceFileName
      rawTraces {
        scope
        id
        traceType
        sourceEvent
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
