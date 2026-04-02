import gql from 'graphql-tag'

export const GET_AGENT_PACKAGE_ROOTS = gql`
  query GetAgentPackageRoots {
    agentPackageRoots {
      path
      sharedAgentCount
      teamLocalAgentCount
      agentTeamCount
      isDefault
    }
  }
`

export const ADD_AGENT_PACKAGE_ROOT = gql`
  mutation AddAgentPackageRoot($path: String!) {
    addAgentPackageRoot(path: $path) {
      path
      sharedAgentCount
      teamLocalAgentCount
      agentTeamCount
      isDefault
    }
  }
`

export const REMOVE_AGENT_PACKAGE_ROOT = gql`
  mutation RemoveAgentPackageRoot($path: String!) {
    removeAgentPackageRoot(path: $path) {
      path
      sharedAgentCount
      teamLocalAgentCount
      agentTeamCount
      isDefault
    }
  }
`
