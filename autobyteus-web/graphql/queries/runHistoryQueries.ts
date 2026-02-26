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
      workspaceRootPath
      summary
      lastActivityAt
      lastKnownStatus
      deleteLifecycle
      isActive
      members {
        memberRouteKey
        memberName
        memberRunId
        workspaceRootPath
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
  query GetTeamMemberRunProjection($teamRunId: String!, $memberRouteKey: String!) {
    getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
      agentRunId
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
        runtimeKind
        runtimeReference {
          runtimeKind
          sessionId
          threadId
          metadata
        }
      }
      editableFields {
        llmModelIdentifier
        llmConfig
        autoExecuteTools
        skillAccessMode
        workspaceRootPath
        runtimeKind
      }
    }
  }
`;
