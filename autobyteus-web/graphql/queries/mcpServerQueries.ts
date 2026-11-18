import { gql } from 'graphql-tag'

export const GET_MCP_SERVERS = gql`
  query GetMcpServers {
    mcpServers {
      __typename
      ... on StdioMcpServerConfig {
        serverId
        transportType
        enabled
        toolNamePrefix
        command
        args
        env {
          name
          value
          state
        }
        cwd
      }
      ... on StreamableHttpMcpServerConfig {
        serverId
        transportType
        enabled
        toolNamePrefix
        url
        tokenState
        headers {
          name
          value
          state
        }
      }
    }
  }
`

export const PREVIEW_MCP_SERVER_TOOLS = gql`
  query PreviewMcpServerTools($input: McpServerInput!) {
    previewMcpServerTools(input: $input) {
      __typename
      name
      description
    }
  }
`

export const GET_MCP_SECRET_SUGGESTION_RULE = gql`
  query GetMcpSecretSuggestionRule {
    mcpSecretSuggestionRule {
      __typename
      nameKeywords
      valuePrefixes
      alwaysSecretFields
    }
  }
`

export const GET_MCP_SECRET_MOVE_CANDIDATES = gql`
  query GetMcpSecretMoveCandidates {
    mcpSecretMoveCandidates {
      __typename
      serverId
      field
      matchedBy
    }
  }
`
