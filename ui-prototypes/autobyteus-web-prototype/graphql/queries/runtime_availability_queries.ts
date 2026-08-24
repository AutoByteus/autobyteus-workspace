import gql from 'graphql-tag';

export const GET_RUNTIME_AVAILABILITIES = gql`
  query GetRuntimeAvailabilities {
    runtimeAvailabilities {
      runtimeKind
      enabled
      reason
    }
  }
`;
