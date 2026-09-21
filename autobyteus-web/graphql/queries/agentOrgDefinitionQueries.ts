import { gql } from 'graphql-tag'
export const GetAgentOrgDefinitions = gql`
  query GetAgentOrgDefinitions {
    agentOrgDefinitions {
      id name description instructions category avatarUrl revision
      handoffs { from to rules }
      members { memberName ref refType refScope }
      defaultLaunchConfig { llmModelIdentifier runtimeKind llmConfig }
    }
  }
`
export const GetAgentOrgEndpointCatalog = gql`
  query GetAgentOrgEndpointCatalog($id: String!) {
    agentOrgEndpointCatalog(id: $id) {
      from { kind address memberName definitionId coordinatorAddress coordinatorMemberName }
      to { kind address memberName definitionId coordinatorAddress coordinatorMemberName }
    }
  }
`

// Exact reads include owned definitions which are deliberately absent from lists.
export const GetAgentOrgReferencedAgent = gql`
  query GetAgentOrgReferencedAgent($id: String!) {
    agentDefinition(id: $id) { id name description ownershipScope ownerOrgId ownerTeamId }
  }
`
export const GetAgentOrgReferencedTeam = gql`
  query GetAgentOrgReferencedTeam($id: String!) {
    agentTeamDefinition(id: $id) {
      id name description instructions category avatarUrl revision handoffs { from to rules }
      ownershipScope ownerOrgId ownerOrgName coordinatorMemberName
      ownerTeamId ownerTeamName ownerApplicationId ownerApplicationName ownerPackageId ownerLocalApplicationId
      defaultLaunchConfig { llmModelIdentifier runtimeKind llmConfig }
      nodes { memberName ref refScope }
    }
  }
`
