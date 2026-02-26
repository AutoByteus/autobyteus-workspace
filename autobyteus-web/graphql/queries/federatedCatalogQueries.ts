import { gql } from 'graphql-tag'

export const FederatedNodeCatalogQuery = gql`
  query FederatedNodeCatalog($input: FederatedNodeCatalogQueryInput!) {
    federatedNodeCatalog(input: $input) {
      nodeId
      nodeName
      baseUrl
      status
      errorMessage
      agents {
        homeNodeId
        definitionId
        name
        role
        description
        avatarUrl
        toolNames
        skillNames
      }
      teams {
        homeNodeId
        definitionId
        name
        description
        role
        avatarUrl
        coordinatorMemberName
        memberCount
        nestedTeamCount
      }
    }
  }
`
