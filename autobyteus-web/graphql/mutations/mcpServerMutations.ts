import { gql } from 'graphql-tag';

export const CONFIGURE_MCP_SERVER = gql`
  mutation ConfigureMcpServer($input: McpServerInput!) {
    configureMcpServer(input: $input) {
      savedConfig {
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
  }
`;

export const DELETE_MCP_SERVER = gql`
  mutation DeleteMcpServer($serverId: String!) {
    deleteMcpServer(serverId: $serverId) {
      __typename
      success
      message
    }
  }
`;

export const DISCOVER_AND_REGISTER_MCP_SERVER_TOOLS = gql`
  mutation DiscoverAndRegisterMcpServerTools($serverId: String!) {
    discoverAndRegisterMcpServerTools(serverId: $serverId) {
      __typename
      success
      message
      discoveredTools {
        __typename
        name
        description
        origin
        category
        argumentSchema {
          __typename
          parameters {
            __typename
            name
            paramType
            description
            required
            defaultValue
            enumValues
          }
        }
      }
    }
  }
`;

export const IMPORT_MCP_SERVER_CONFIGS = gql`
    mutation ImportMcpServerConfigs($jsonString: String!) {
        importMcpServerConfigs(jsonString: $jsonString) {
            __typename
            success
            message
            importedCount
            failedCount
        }
    }
`;
