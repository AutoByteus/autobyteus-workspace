import { gql } from '@apollo/client/core';

export const GetActiveRuntimeSnapshot = gql`
  query GetActiveRuntimeSnapshot {
    agentRuns {
      __typename
      id
      currentStatus
    }
    agentTeamRuns {
      __typename
      id
      currentStatus
    }
  }
`;
