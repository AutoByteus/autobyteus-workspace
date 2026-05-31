import { gql } from 'graphql-tag'

export const LIST_AGENTS_WITH_MEMORY = gql`
  query ListAgentsWithMemory($search: String, $page: Int, $pageSize: Int) {
    listAgentsWithMemory(search: $search, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      totalPages
      entries {
        attribution
        agentDefinitionId
        displayName
        stableId
        runCount
        latestMemoryAt
        memory {
          latestMemoryAt
          hasWorkingContext
          hasEpisodic
          hasSemantic
          hasRawTraces
          hasRawArchive
        }
      }
    }
  }
`

export const LIST_AGENT_RUNS_WITH_MEMORY = gql`
  query ListAgentRunsWithMemory($selector: AgentWithMemorySelectorInput!, $search: String, $page: Int, $pageSize: Int) {
    listAgentRunsWithMemory(selector: $selector, search: $search, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      totalPages
      entries {
        runId
        agentDefinitionId
        agentName
        summary
        workspaceRootPath
        createdAt
        lastUpdatedAt
        memory {
          latestMemoryAt
          hasWorkingContext
          hasEpisodic
          hasSemantic
          hasRawTraces
          hasRawArchive
        }
      }
    }
  }
`

export const LIST_AGENT_TEAMS_WITH_MEMORY = gql`
  query ListAgentTeamsWithMemory($search: String, $page: Int, $pageSize: Int) {
    listAgentTeamsWithMemory(search: $search, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      totalPages
      entries {
        teamDefinitionId
        teamDefinitionName
        teamRunCount
        memberMemoryCount
        latestMemoryAt
        memory {
          latestMemoryAt
          hasWorkingContext
          hasEpisodic
          hasSemantic
          hasRawTraces
          hasRawArchive
        }
      }
    }
  }
`

export const LIST_AGENT_TEAM_RUNS_WITH_MEMORY = gql`
  query ListAgentTeamRunsWithMemory($teamDefinitionId: String!, $search: String, $page: Int, $pageSize: Int) {
    listAgentTeamRunsWithMemory(teamDefinitionId: $teamDefinitionId, search: $search, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      totalPages
      entries {
        teamRunId
        teamDefinitionId
        teamDefinitionName
        summary
        workspaceRootPath
        createdAt
        lastUpdatedAt
        memory {
          latestMemoryAt
          hasWorkingContext
          hasEpisodic
          hasSemantic
          hasRawTraces
          hasRawArchive
        }
        memberTargets {
          memberRouteKey
          memberName
          memberRunId
          agentDefinitionId
          lastUpdatedAt
          memory {
            latestMemoryAt
            hasWorkingContext
            hasEpisodic
            hasSemantic
            hasRawTraces
            hasRawArchive
          }
        }
      }
    }
  }
`
