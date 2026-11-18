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
            jsonSchema
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
            failures {
                __typename
                serverId
                reason
            }
            storedSecrets {
                __typename
                serverId
                field
            }
            needsSecret {
                __typename
                serverId
                field
            }
        }
    }
`;

export const MOVE_MCP_SECRETS_TO_VAULT = gql`
  mutation MoveMcpSecretsToVault($selection: [McpServerFieldInput!]!) {
    moveMcpSecretsToVault(selection: $selection) {
      __typename
      backupPath
      moved {
        __typename
        serverId
        field
      }
      skipped {
        __typename
        serverId
        field
      }
      serversFailingAfterMove {
        __typename
        serverId
        reason
      }
    }
  }
`;
