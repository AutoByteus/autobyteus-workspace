import { gql } from 'graphql-tag'

export const GET_GITHUB_INTEGRATION = gql`
  query GetGitHubIntegration {
    githubIntegration {
      connected
      login
      connectedAt
      agentDefinitionIds
    }
  }
`
