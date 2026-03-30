import gql from 'graphql-tag';

export const UPSERT_EXTERNAL_CHANNEL_BINDING = gql`
  mutation UpsertExternalChannelBinding($input: UpsertExternalChannelBindingInput!) {
    upsertExternalChannelBinding(input: $input) {
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
        skillAccessMode
        llmConfig
      }
      teamRunId
      updatedAt
    }
  }
`;

export const DELETE_EXTERNAL_CHANNEL_BINDING = gql`
  mutation DeleteExternalChannelBinding($id: String!) {
    deleteExternalChannelBinding(id: $id)
  }
`;
