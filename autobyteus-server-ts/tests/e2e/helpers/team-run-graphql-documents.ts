export const E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT = `
  query E2eTeamRunResumeConfig($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) {
      teamRunId
      isActive
      executionTree
    }
  }
`;

export const E2E_TEAM_MEMBER_RUN_PROJECTION_DOCUMENT = `
  query E2eTeamMemberRunProjection($teamRunId: String!, $agentRunId: String!) {
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

export const E2E_TEAM_MEMBER_RUN_MEMORY_VIEW_DOCUMENT = `
  query E2eTeamMemberRunMemoryView(
    $teamRunId: String!
    $agentRunId: String!
    $rawTraceLimit: Int = 300
  ) {
    getTeamMemberRunMemoryView(
      teamRunId: $teamRunId
      agentRunId: $agentRunId
      includeWorkingContext: false
      includeEpisodic: false
      includeSemantic: false
      includeRawTraces: true
      rawTraceLimit: $rawTraceLimit
    ) {
      rawTraces {
        traceType
        sourceEvent
        toolName
        toolCallId
        toolArgs
        toolResult
        toolError
      }
    }
  }
`;
