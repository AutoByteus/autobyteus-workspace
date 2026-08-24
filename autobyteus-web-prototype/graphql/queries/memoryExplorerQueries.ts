import { gql } from 'graphql-tag'

export const LIST_MEMORY_EXPLORER_SOURCES = gql`
  query ListMemoryExplorerSources {
    listMemoryExplorerSources {
      key
      type
      label
      sourceNodeId
      displayName
      readOnly
      lastImportedAt
      lastSyncStatus
    }
  }
`

export const LIST_AGENTS_WITH_MEMORY = gql`
  query ListAgentsWithMemory($source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
    listAgentsWithMemory(source: $source, search: $search, page: $page, pageSize: $pageSize) {
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
  query ListAgentRunsWithMemory($selector: AgentWithMemorySelectorInput!, $source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
    listAgentRunsWithMemory(selector: $selector, source: $source, search: $search, page: $page, pageSize: $pageSize) {
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
  query ListAgentTeamsWithMemory($source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
    listAgentTeamsWithMemory(source: $source, search: $search, page: $page, pageSize: $pageSize) {
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
  query ListAgentTeamRunsWithMemory($teamDefinitionId: String!, $source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
    listAgentTeamRunsWithMemory(teamDefinitionId: $teamDefinitionId, source: $source, search: $search, page: $page, pageSize: $pageSize) {
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
          memberAddress
          displayName
          agentRunId
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
