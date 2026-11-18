import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  TeamMemberTreeRow,
  TeamTreeNode,
} from './runHistoryTypes';

const stableRowKey = (row: TeamMemberTreeRow): string => row.kind === 'agent'
  ? `agent:${row.agentRunId}`
  : `team:${row.teamRunIdForNode}`;

const flattenStableRows = (
  rows: readonly TeamMemberTreeRow[],
  depth = 0,
): RunHistoryStableExecutionRow[] => rows.flatMap((row) => [{
  kind: 'stable_member' as const,
  rowKey: stableRowKey(row),
  teamRunId: row.teamRunId,
  memberAddress: row.memberAddress,
  agentRunId: row.agentRunId ?? null,
  teamRunIdForNode: row.teamRunIdForNode ?? null,
  memberKind: row.kind,
  displayName: row.displayName || row.memberAddress,
  depth,
  hasChildren: row.children.length > 0,
  row,
}, ...flattenStableRows(row.children, depth + 1)]);

/**
 * A Team run's own members as the Workspaces tree shows them (autobyteus-461 SR-084): the runs it delegated are the
 * server's tree's rows (`runTreeStore`), shown by `WorkspaceTeamExecutionTree`; nothing about them is built here.
 */
export const buildRunHistoryTeamExecutionRows = (team: TeamTreeNode): RunHistoryTeamExecutionRow[] =>
  flattenStableRows(team.rootTeam.children.length > 0 ? team.rootTeam.children : team.members);
