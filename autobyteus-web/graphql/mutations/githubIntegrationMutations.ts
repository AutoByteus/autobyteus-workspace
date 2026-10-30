import { gql } from 'graphql-tag'

export const CONNECT_GITHUB_INTEGRATION = gql`
  mutation ConnectGitHubIntegration($token: String!) {
    connectGitHubIntegration(token: $token) {
      connected
      login
      connectedAt
      agentDefinitionIds
    }
  }
`

export const TEST_GITHUB_INTEGRATION = gql`
  mutation TestGitHubIntegration {
    testGitHubIntegration {
      connected
      login
      connectedAt
      agentDefinitionIds
    }
  }
`

export const DISCONNECT_GITHUB_INTEGRATION = gql`
  mutation DisconnectGitHubIntegration {
    disconnectGitHubIntegration {
      connected
      login
      connectedAt
      agentDefinitionIds
    }
  }
`

export const SET_GITHUB_INTEGRATION_AGENT_ACCESS = gql`
  mutation SetGitHubIntegrationAgentAccess($agentDefinitionIds: [String!]!) {
    setGitHubIntegrationAgentAccess(agentDefinitionIds: $agentDefinitionIds) {
      connected
      login
      connectedAt
      agentDefinitionIds
    }
  }
`
