import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import type { RunHistoryTeamExecutionRow, TeamMemberFocusTarget } from '~/stores/runHistoryTypes'
import type { RunTreeRef } from '~/stores/runTreeStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'

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

/**
 * The one open path of a run tree's row (autobyteus-461 SR-084): where the server says it opens, selected in the tree of
 * the run it belongs to (`top`). A delegated run on this node opens as its own run (rule 2), a peer's through its view;
 * a row with no target (a row error) opens nothing. Answers whether the row was selected.
 */
export const openRunTarget = (top: RunTreeRef, row: RunTreeRowDto): boolean => {
  if (top.kind === 'agent') return useAgentRunCollaborationStore().selectTreeRow(top.runId, row)
  if (top.kind === 'agent_org') return useAgentOrgContextsStore().selectTreeRow(top.runId, row)
  // A Team's own member is focused in the Team (its open action); a run it delegated opens as its own run.
  return useAgentTeamContextsStore().selectTreeRow(top.runId, row)
}
