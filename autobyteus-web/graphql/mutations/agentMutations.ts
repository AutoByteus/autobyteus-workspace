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

export const CreateAgentRun = gql`
  mutation CreateAgentRun($input: CreateAgentRunInput!) {
    createAgentRun(input: $input) {
      success
      message
      runId
    }
  }
`;

export const RestoreAgentRun = gql`
  mutation RestoreAgentRun($agentRunId: String!) {
    restoreAgentRun(agentRunId: $agentRunId) {
      __typename
      success
      message
      runId
    }
  }
`;

export const ApproveToolInvocation = gql`
  mutation ApproveToolInvocation($input: ApproveToolInvocationInput!) {
    approveToolInvocation(input: $input) {
      __typename
      success
      message
    }
  }
`;
