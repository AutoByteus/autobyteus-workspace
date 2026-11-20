import { gql } from 'graphql-tag';

export const TerminateAgentRun = gql`
  mutation TerminateAgentRun($agentRunId: String!) {
    terminateAgentRun(agentRunId: $agentRunId) {
      __typename
      success
      message
    }
  }
`;

export const PrepareAgentRun = gql`
  mutation PrepareAgentRun($input: CreateAgentRunInput!) {
    prepareAgentRun(input: $input) {
      success
      message
      runId
      activationState
      preparedExpiresAt
    }
  }
`;

export const CancelPreparedAgentRun = gql`
  mutation CancelPreparedAgentRun($agentRunId: String!) {
    cancelPreparedAgentRun(agentRunId: $agentRunId) {
      success
      message
    }
  }
`;
