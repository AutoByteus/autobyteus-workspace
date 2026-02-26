import { gql } from 'graphql-tag';

export const ContinueRun = gql`
  mutation ContinueRun($input: ContinueRunInput!) {
    continueRun(input: $input) {
      success
      message
      runId
      ignoredConfigFields
    }
  }
`;

export const DeleteRunHistory = gql`
  mutation DeleteRunHistory($runId: String!) {
    deleteRunHistory(runId: $runId) {
      success
      message
    }
  }
`;

export const DeleteTeamRunHistory = gql`
  mutation DeleteTeamRunHistory($teamRunId: String!) {
    deleteTeamRunHistory(teamRunId: $teamRunId) {
      success
      message
    }
  }
`;
