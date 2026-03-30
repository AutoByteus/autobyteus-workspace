import { gql } from 'graphql-tag';

export const DeleteStoredRun = gql`
  mutation DeleteStoredRun($runId: String!) {
    deleteStoredRun(runId: $runId) {
      success
      message
    }
  }
`;

export const DeleteStoredTeamRun = gql`
  mutation DeleteStoredTeamRun($teamRunId: String!) {
    deleteStoredTeamRun(teamRunId: $teamRunId) {
      success
      message
    }
  }
`;
