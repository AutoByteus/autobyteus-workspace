import gql from 'graphql-tag';

export const EXTERNAL_CHANNEL_CAPABILITIES = gql`
  query ExternalChannelCapabilities {
    externalChannelCapabilities {
      __typename
      bindingCrudEnabled
      reason
      acceptedProviderTransportPairs
    }
  }
`;

export const EXTERNAL_CHANNEL_BINDINGS = gql`
  query ExternalChannelBindings {
    externalChannelBindings {
      __typename
      id
      provider
      transport
      accountId
      peerId
      threadId
      targetType
      targetAgentDefinitionId
      launchPreset {
        workspaceRootPath
        llmModelIdentifier
        runtimeKind
        autoExecuteTools
        skillAccessMode
        llmConfig
      }
      updatedAt
    }
  }
`;
