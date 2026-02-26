import { gql } from '@apollo/client/core';

export const GetAgentRuns = gql`
  query GetAgentRuns {
    agentRuns {
      __typename
      id
      name
      role
      currentStatus
      agentDefinitionId
      workspace {
        __typename
        workspaceId
        name
        config
      }
    }
  }
`;
