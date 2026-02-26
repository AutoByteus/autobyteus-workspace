import { gql } from 'graphql-tag'

export const LIST_RUN_MEMORY_SNAPSHOTS = gql`
  query ListRunMemorySnapshots($search: String, $page: Int, $pageSize: Int) {
    listRunMemorySnapshots(search: $search, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      totalPages
      entries {
        runId
        lastUpdatedAt
        hasWorkingContext
        hasEpisodic
        hasSemantic
        hasRawTraces
        hasRawArchive
      }
    }
  }
`
