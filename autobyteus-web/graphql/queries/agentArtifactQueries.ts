import { gql } from '@apollo/client/core';

export const GetAgentArtifacts = gql`
  query GetAgentArtifacts($runId: String!) {
    agentArtifacts(runId: $runId) {
      id
      runId
      path
      type
      workspaceRoot
      createdAt
      updatedAt
    }
  }
`;
