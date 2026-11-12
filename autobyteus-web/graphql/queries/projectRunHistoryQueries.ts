import { gql } from 'graphql-tag';

/** One Project's runs: the runs started under it, grouped like a workspace's (autobyteus-353). */
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
    }
  }
`;
