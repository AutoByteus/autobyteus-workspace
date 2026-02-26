import gql from 'graphql-tag';

export const GET_RUNTIME_CAPABILITIES = gql`
  query GetRuntimeCapabilities {
    runtimeCapabilities {
      runtimeKind
      enabled
      reason
    }
  }
`;
