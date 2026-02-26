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
      targetId
      updatedAt
    }
  }
`;

export const DELETE_EXTERNAL_CHANNEL_BINDING = gql`
  mutation DeleteExternalChannelBinding($id: String!) {
    deleteExternalChannelBinding(id: $id)
  }
`;
