import { gql } from 'graphql-tag'

export const DiscoveredNodeCatalogQuery = gql`
  query DiscoveredNodeCatalog {
    discoveredNodeCatalog {
      nodeId
      nodeName
      baseUrl
      advertisedBaseUrl
      status
      lastSeenAtIso
      trustMode
      capabilities {
        terminal
        fileExplorerStreaming
      }
    }
  }
`
