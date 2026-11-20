import { gql } from 'graphql-tag'

/** autobyteus-554: a semantic memory folder's state before the Memory page opens it (never creates it). */
export const AGENT_SEMANTIC_MEMORY_FOLDER = gql`
  query AgentSemanticMemoryFolder($agentDefinitionId: String!) {
    agentSemanticMemoryFolder(agentDefinitionId: $agentDefinitionId) {
      folderPath
      exists
      isEmpty
    }
  }
`

export const GLOBAL_SEMANTIC_MEMORY_FOLDER = gql`
  query GlobalSemanticMemoryFolder {
    globalSemanticMemoryFolder {
      folderPath
      exists
      isEmpty
    }
  }
`
