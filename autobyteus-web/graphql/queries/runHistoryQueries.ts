import { gql } from 'graphql-tag';

export const ListWorkspaceRunHistory = gql`
  query ListWorkspaceRunHistory($limitPerAgent: Int = 6) {
    listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
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
      teamRuns {
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
          runtimeKind
          workspaceRootPath
        }
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

export const GetRunFileChanges = gql`
  query GetRunFileChanges($runId: String!) {
    getRunFileChanges(runId: $runId) {
      id
      runId
      path
      type
      status
      sourceTool
      sourceInvocationId
      backendArtifactId
      content
      createdAt
      updatedAt
    }
  }
`;

export const GetTeamRunResumeConfig = gql`
  query GetTeamRunResumeConfig($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) {
      teamRunId
      isActive
      metadata
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

export const GetAgentRunResumeConfig = gql`
  query GetAgentRunResumeConfig($runId: String!) {
    getAgentRunResumeConfig(runId: $runId) {
      runId
      isActive
      metadataConfig {
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
