import { gql } from 'graphql-tag';

export const TerminateAgentRun = gql`
  mutation TerminateAgentRun($id: String!) {
    terminateAgentRun(id: $id) {
      __typename
      success
      message
    }
  }
`;

export const SendAgentUserInput = gql`
  mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
    sendAgentUserInput(input: $input) {
      __typename
      success
      message
      agentRunId
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
