import { gql } from '@apollo/client/core';

export const GetActiveRuntimeSnapshot = gql`
  query GetActiveRuntimeSnapshot {
    agentRuns {
      __typename
      id
      name
      currentStatus
    }
    agentTeamRuns {
      __typename
      id
      name
      currentStatus
      members {
        memberRouteKey
        memberName
        memberRunId
        currentStatus
      }
    }
  }
`;
