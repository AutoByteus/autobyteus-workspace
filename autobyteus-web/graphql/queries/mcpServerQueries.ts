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
        env
        cwd
      }
      ... on StreamableHttpMcpServerConfig {
        serverId
        transportType
        enabled
        toolNamePrefix
        url
        token
        headers
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
