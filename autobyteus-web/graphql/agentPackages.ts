import gql from 'graphql-tag'

export const GET_AGENT_PACKAGES = gql`
  query GetAgentPackages {
    agentPackages {
      packageId
      displayName
      path
      sourceKind
      source
      sharedAgentCount
      teamLocalAgentCount
      agentTeamCount
      isDefault
      isRemovable
    }
  }
`

export const IMPORT_AGENT_PACKAGE = gql`
  mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
    importAgentPackage(input: $input) {
      packageId
      displayName
      path
      sourceKind
      source
      sharedAgentCount
      teamLocalAgentCount
      agentTeamCount
      isDefault
      isRemovable
    }
  }
`

export const REMOVE_AGENT_PACKAGE = gql`
  mutation RemoveAgentPackage($packageId: String!) {
    removeAgentPackage(packageId: $packageId) {
      packageId
      displayName
      path
      sourceKind
      source
      sharedAgentCount
      teamLocalAgentCount
      agentTeamCount
      isDefault
      isRemovable
    }
  }
`
