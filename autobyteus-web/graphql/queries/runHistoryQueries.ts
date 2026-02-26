import { gql } from 'graphql-tag';

export const ListRunHistory = gql`
  query ListRunHistory($limitPerAgent: Int = 6) {
    listRunHistory(limitPerAgent: $limitPerAgent) {
      workspaceRootPath
      workspaceName
      agents {
        agentDefinitionId
        agentName
        runs {
          runId
          summary
          lastActivityAt
          lastKnownStatus
          isActive
        }
      }
    }
  }
`;

export const ListTeamRunHistory = gql`
  query ListTeamRunHistory {
    listTeamRunHistory {
      teamRunId
      teamDefinitionId
      teamDefinitionName
      summary
      lastActivityAt
      lastKnownStatus
      deleteLifecycle
      isActive
      members {
        memberRouteKey
        memberName
        memberAgentId
        workspaceRootPath
        hostNodeId
      }
    }
  }
`;

export const GetRunProjection = gql`
  query GetRunProjection($runId: String!) {
    getRunProjection(runId: $runId) {
      runId
      summary
      lastActivityAt
      conversation
    }
  }
`;

export const GetRunResumeConfig = gql`
  query GetRunResumeConfig($runId: String!) {
    getRunResumeConfig(runId: $runId) {
      runId
      isActive
      manifestConfig {
        agentDefinitionId
        workspaceRootPath
        llmModelIdentifier
        llmConfig
        autoExecuteTools
        skillAccessMode
      }
      editableFields {
        llmModelIdentifier
        llmConfig
        autoExecuteTools
        skillAccessMode
        workspaceRootPath
      }
    }
  }
`;

export const GetTeamRunResumeConfig = gql`
  query GetTeamRunResumeConfig($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) {
      teamRunId
      isActive
      manifest
    }
  }
`;

export const GetTeamMemberRunProjection = gql`
  query GetTeamMemberRunProjection($teamRunId: String!, $memberRouteKey: String!, $memberAgentId: String) {
    getTeamMemberRunProjection(
      teamRunId: $teamRunId
      memberRouteKey: $memberRouteKey
      memberAgentId: $memberAgentId
    ) {
      runId
      summary
      lastActivityAt
      conversation
    }
  }
`;
