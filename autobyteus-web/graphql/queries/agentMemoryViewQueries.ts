import { gql } from 'graphql-tag'

export const GET_RUN_MEMORY_VIEW = gql`
  query GetRunMemoryView(
    $runId: String!
    $includeWorkingContext: Boolean
    $includeEpisodic: Boolean
    $includeSemantic: Boolean
    $includeRawTraces: Boolean
    $includeArchive: Boolean
    $rawTraceLimit: Int
  ) {
    getRunMemoryView(
      runId: $runId
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
