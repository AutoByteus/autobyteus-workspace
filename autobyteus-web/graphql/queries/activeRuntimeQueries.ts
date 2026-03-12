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

export const GetActiveAgentRunSnapshot = gql`
  query GetActiveAgentRunSnapshot($id: String!) {
    activeAgentRunSnapshot(id: $id) {
      __typename
      id
      name
      currentStatus
    }
  }
`;

export const GetActiveAgentTeamRunSnapshot = gql`
  query GetActiveAgentTeamRunSnapshot($id: String!) {
    activeAgentTeamRunSnapshot(id: $id) {
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
