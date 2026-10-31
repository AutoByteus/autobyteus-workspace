import { gql } from 'graphql-tag';

/** projects-left-navigation (DS-003): one Project's runs, grouped like a workspace's, with each listed root's scope. */
export const GetProjectRunHistory = gql`
  query GetProjectRunHistory($projectId: String!, $limitPerAgent: Int = 6) {
    projectRunHistory(projectId: $projectId, limitPerAgent: $limitPerAgent) {
      projectId
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
          hasCollaboration
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
      agentOrgRuns {
        root_subject_kind
        root_run_id
        created_at
        archived_at
        is_active
        summary
        org
        closed_task_executions
      }
      scopes {
        rootKind
        rootRunId
        executions {
          agentRunId
          teamRunId
        }
      }
    }
  }
`;
