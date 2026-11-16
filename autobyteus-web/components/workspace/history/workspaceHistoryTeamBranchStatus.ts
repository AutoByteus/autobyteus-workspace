import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryTeamExecutionRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus';
import { useRunStatusStore } from '~/stores/runStatusStore';

/** The statuses the Agent rows among `rows` show (a Team row counts through its own Agent rows). */
const agentStatusesOf = (
  rows: readonly RunHistoryTeamExecutionRow[],
): Array<AgentStatus | string | null | undefined> => rows.flatMap((row) => {
  if (row.memberKind !== 'agent') return [];
  return [row.kind === 'stable_member' ? row.row.currentStatus : row.currentStatus];
});

/**
 * The status of one delegated Team row in a Team run's rows (Teams are flat, so a Team run's
 * configured rows are Agents): every Agent row beneath it by depth, collapsed or not. Closed
 * task rows are not in `executionRows`.
 */
export const teamBranchStatus = (
  rows: readonly RunHistoryTeamExecutionRow[],
  teamRow: RunHistoryTeamExecutionRow,
  runAlive: boolean,
): TeamStatus => {
  if (teamRow.memberKind !== 'agent_team') return AgentStatus.Offline;
  const teamIndex = rows.findIndex(
    (row) => row === teamRow || row.rowKey === teamRow.rowKey,
  );
  if (teamIndex < 0) return AgentStatus.Offline;

  let end = teamIndex + 1;
  while (end < rows.length && rows[end]!.depth > teamRow.depth) end += 1;
  return resolveTeamStatus(agentStatusesOf(rows.slice(teamIndex + 1, end)), runAlive);
};

/**
 * The status of a Team run's row: the team run's own status, computed by its root from its own agents (autobyteus-461
 * SR-086 G-A4), never folded here; offline until its node answered. The run is held by the list that shows it.
 */
export const teamRunStatus = (team: Pick<TeamTreeNode, 'teamRunId'>): TeamStatus => {
  const status = useRunStatusStore().runStateOf({ kind: 'agent_team', runId: team.teamRunId })?.status ?? AgentStatus.Offline;
  return (status === 'initializing' ? AgentStatus.Running : status) as TeamStatus;
};

/** The status of a Team group row: the highest status among its runs. */
export const teamDefinitionGroupStatus = (runs: readonly TeamTreeNode[]): TeamStatus =>
  resolveTeamStatus(runs.map(teamRunStatus), true);
