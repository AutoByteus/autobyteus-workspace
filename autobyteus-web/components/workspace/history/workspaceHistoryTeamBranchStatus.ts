import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryTeamExecutionRow } from '~/stores/runHistoryTypes';
import { foldTeamAggregateStatus } from '~/utils/workspaceTeamAggregateStatus';

const rowAgentStatus = (
  row: RunHistoryTeamExecutionRow,
): AgentStatus | string | null | undefined => {
  if (row.memberKind !== 'agent') return AgentStatus.Offline;
  return row.kind === 'stable_member' ? row.row.currentStatus : row.currentStatus;
};

export const aggregateTeamBranchAgentStatus = (
  rows: readonly RunHistoryTeamExecutionRow[],
  teamRow: RunHistoryTeamExecutionRow,
): AgentStatus => {
  if (teamRow.kind !== 'stable_member' || teamRow.memberKind !== 'agent_team') {
    return AgentStatus.Offline;
  }

  const teamIndex = rows.findIndex(
    (row) => row === teamRow || row.rowKey === teamRow.rowKey,
  );
  if (teamIndex < 0) return AgentStatus.Offline;

  const statuses: Array<AgentStatus | string | null | undefined> = [];
  for (let index = teamIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || row.depth <= teamRow.depth) break;
    if (row.memberKind === 'agent') statuses.push(rowAgentStatus(row));
  }
  return foldTeamAggregateStatus(statuses, 'live');
};
