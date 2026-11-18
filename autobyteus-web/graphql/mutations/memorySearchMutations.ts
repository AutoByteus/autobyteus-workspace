import { gql } from 'graphql-tag'

export const START_MEMORY_INDEXING = gql`
  mutation StartMemoryIndexing {
    startMemoryIndexing
  }
`

export const REBUILD_MEMORY_INDEX = gql`
  mutation RebuildMemoryIndex {
    rebuildMemoryIndex
  }
`
