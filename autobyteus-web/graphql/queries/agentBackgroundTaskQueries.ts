import { gql } from '@apollo/client/core';

export const AgentBackgroundTaskView = gql`
  query AgentBackgroundTaskView($agentRunId: String!) {
    agentBackgroundTaskView(agentRunId: $agentRunId) {
      __typename
      ... on AgentBackgroundTaskSnapshot {
        agentRunId runInstanceId observedAt
        tasks { taskId kind description command status exitCode startedAt }
      }
      ... on AgentBackgroundTaskEventStream {
        agentRunId
        # Aliased: both union members have a \`tasks\` field, with different row types.
        currentTasks: tasks { taskId kind description command status summary startedAt }
      }
      ... on AgentBackgroundTaskUnsupported { agentRunId reason }
      ... on AgentBackgroundTaskUnavailable { agentRunId reason }
    }
  }
`;
