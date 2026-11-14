import type { RunHistoryTeamExecutionRow, TeamMemberFocusTarget } from '~/stores/runHistoryTypes'

/**
 * The agent a row opens (autobyteus-461 SR-083, FU-031): the run's own member, or a delegated row's target as the server
 * built it (a team run its coordinator; a delegated Team's member itself). The same row opens the same agent in every
 * view; a row with no target (a row error) opens nothing. Clients never pick a member themselves (FU-024).
 */
export const rowOpenAgentRunId = (row: RunHistoryTeamExecutionRow): string | null =>
  row.kind === 'stable_member' ? row.agentRunId : row.openTarget?.agentRunId ?? null

/** A Team run tree's row, focused in that Team run's view: the agent it opens. */
export const teamRowFocusOf = (teamRunId: string, row: RunHistoryTeamExecutionRow): TeamMemberFocusTarget | null => {
  const agentRunId = rowOpenAgentRunId(row)
  return agentRunId ? { teamRunId, memberAddress: row.memberAddress, agentRunId } : null
}
