import { gql } from '@apollo/client/core';

export const AgentBackgroundTaskView = gql`
  query AgentBackgroundTaskView($agentRunId: String!) {
    agentBackgroundTaskView(agentRunId: $agentRunId) {
      __typename
      ... on AgentBackgroundTaskSnapshot {
        agentRunId runInstanceId observedAt
        tasks { taskId kind description command status exitCode startedAt }
      }
      ... on AgentBackgroundTaskEventStream { agentRunId }
      ... on AgentBackgroundTaskUnsupported { agentRunId reason }
      ... on AgentBackgroundTaskUnavailable { agentRunId reason }
    }
  }
`;
