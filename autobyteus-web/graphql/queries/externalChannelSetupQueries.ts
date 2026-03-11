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
      targetTeamDefinitionId
      launchPreset {
        workspaceRootPath
        llmModelIdentifier
        runtimeKind
        autoExecuteTools
        skillAccessMode
        llmConfig
      }
      teamLaunchPreset {
        workspaceRootPath
        llmModelIdentifier
        runtimeKind
        autoExecuteTools
        llmConfig
      }
      teamRunId
      updatedAt
    }
  }
`;

export const EXTERNAL_CHANNEL_TEAM_DEFINITION_OPTIONS = gql`
  query ExternalChannelTeamDefinitionOptions {
    externalChannelTeamDefinitionOptions {
      __typename
      teamDefinitionId
      teamDefinitionName
      description
      coordinatorMemberName
      memberCount
    }
  }
`;
