import { gql } from 'graphql-tag';

export const ListWorkspaceRunHistory = gql`
  query ListWorkspaceRunHistory($limitPerAgent: Int = 6) {
    listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
      workspaceRootPath
      workspaceName
      agentDefinitions {
        agentDefinitionId
        agentName
        runs {
          runId
          summary
          createdAt
          archivedAt
          terminatedAt
          status
          isActive
          shouldConnectStream
          statusSource
        }
      }
      teamDefinitions {
        teamDefinitionId
        teamDefinitionName
        runs {
          teamRunId
          teamDefinitionId
          teamDefinitionName
          coordinatorAddress
          workspaceRootPath
          summary
          createdAt
          archivedAt
          terminatedAt
          isActive
          rootTeam
          members {
            memberAddress
            displayName
            agentRunId
            status
            runtimeKind
            workspaceRootPath
          }
        }
      }
    }
  }
`;


export const GetWorkspaceRunHistory = gql`
  query GetWorkspaceRunHistory($workspaceId: String!, $limitPerAgent: Int = 6) {
    workspaceRunHistory(workspaceId: $workspaceId, limitPerAgent: $limitPerAgent) {
      workspaceRootPath
      workspaceName
      agentDefinitions {
        agentDefinitionId
        agentName
        runs {
          runId
          summary
          createdAt
          archivedAt
          terminatedAt
          status
          isActive
          shouldConnectStream
          statusSource
        }
      }
      teamDefinitions {
        teamDefinitionId
        teamDefinitionName
        runs {
          teamRunId
          teamDefinitionId
          teamDefinitionName
          coordinatorAddress
          workspaceRootPath
          summary
          createdAt
          archivedAt
          terminatedAt
          isActive
          rootTeam
          members {
            memberAddress
            displayName
            agentRunId
            status
            runtimeKind
            workspaceRootPath
          }
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
      activities
      hasEarlierActiveTraceEvents
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
      content
      createdAt
      updatedAt
    }
  }
`;

const activeTracePageFields = gql`
  fragment EventMonitorActiveTracePageFields on EventMonitorActiveTracePage {
    beforeCursor
    hasEarlier
    loadedEarlierCount
    activeGeneration
    cursorStatus
    events {
      eventId
      turnGroupId
      occurredAtMs
      visuals {
        ... on EventMonitorUserVisual {
          kind visualId eventId kindOrdinal text
          attachments { attachmentId mediaType locator }
        }
        ... on EventMonitorAssistantTextVisual { kind visualId eventId kindOrdinal content }
        ... on EventMonitorThinkingVisual { kind visualId eventId kindOrdinal content }
        ... on EventMonitorToolCardVisual {
          kind visualId eventId kindOrdinal invocationId cardKind toolName statusKey errorMessage
          summaryArgs {
            path file_path filepath filename target_path command cmd script query prompt url message text title name raw
          }
          approvalTarget {
            agentRunId
          }
        }
        ... on EventMonitorMediaVisual { kind visualId eventId kindOrdinal mediaType urls }
        ... on EventMonitorCompactionVisual {
          kind visualId eventId kindOrdinal activityId phase message turnId rawTraceCount semanticFactCount provider
        }
      }
    }
  }
`;

export const GetRunEventMonitorActiveTracePage = gql`
  query GetRunEventMonitorActiveTracePage($runId: String!, $beforeCursor: String) {
    getRunEventMonitorActiveTracePage(runId: $runId, beforeCursor: $beforeCursor) {
      ...EventMonitorActiveTracePageFields
    }
  }
  ${activeTracePageFields}
`;

export const GetTeamMemberEventMonitorActiveTracePage = gql`
  query GetTeamMemberEventMonitorActiveTracePage(
    $teamRunId: String!, $agentRunId: String!, $beforeCursor: String
  ) {
    getTeamMemberEventMonitorActiveTracePage(
      teamRunId: $teamRunId, agentRunId: $agentRunId, beforeCursor: $beforeCursor
    ) {
      ...EventMonitorActiveTracePageFields
    }
  }
  ${activeTracePageFields}
`;

export const GetTeamRunResumeConfig = gql`
  query GetTeamRunResumeConfig($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) {
      teamRunId
      isActive
      executionTree
    }
  }
`;

export const GetTeamRunExecutionCheckpoint = gql`
  query GetTeamRunExecutionCheckpoint($teamRunId: String!) {
    getTeamRunExecutionCheckpoint(teamRunId: $teamRunId) {
      rootTeamRunId
      changeSequence
      hasOpenExecutionWork
    }
  }
`;

export const GetTeamMemberRunProjection = gql`
  query GetTeamMemberRunProjection($teamRunId: String!, $agentRunId: String!) {
    getTeamMemberRunProjection(teamRunId: $teamRunId, agentRunId: $agentRunId) {
      agentRunId
      summary
      lastActivityAt
      conversation
      activities
      hasEarlierActiveTraceEvents
    }
  }
`;


export const GetTeamCommunicationMessages = gql`
  query GetTeamCommunicationMessages($teamRunId: String!) {
    getTeamCommunicationMessages(teamRunId: $teamRunId) {
      messageId
      senderAgentRunId
      receiverAgentRunId
      content
      messageType
      createdAt
      referenceFiles {
        referenceId
        path
        type
        createdAt
        updatedAt
      }
    }
  }
`;



export const GetTaskDelegationRecords = gql`
  query GetTaskDelegationRecords($teamRunId: String!) {
    getTaskDelegationRecords(teamRunId: $teamRunId) {
      taskId
      delegatorAgentRunId
      recipientAddress
      targetAgentRunId
      targetTeamRunId
      status
      description
      referenceFiles {
        referenceId
        path
        type
        createdAt
        updatedAt
      }
      updates {
        kind
        submissionId
        reviewId
        interruptionId
        reviewedSubmissionId
        decision
        content
        referenceFiles {
          referenceId
          path
          type
          createdAt
          updatedAt
        }
        createdAt
      }
      createdAt
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
