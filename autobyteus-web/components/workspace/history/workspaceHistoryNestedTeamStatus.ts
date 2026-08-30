import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryTeamExecutionRow } from '~/stores/runHistoryTypes';

const statusRank: Record<AgentStatus, number> = {
  [AgentStatus.Offline]: 0,
  [AgentStatus.Idle]: 1,
  [AgentStatus.Error]: 2,
  [AgentStatus.Initializing]: 3,
  [AgentStatus.Running]: 4,
};

const normalizedAgentStatus = (
  status: AgentStatus | string | null | undefined,
): AgentStatus => {
  switch (typeof status === 'string' ? status.trim().toLowerCase() : '') {
    case AgentStatus.Running:
      return AgentStatus.Running;
    case AgentStatus.Initializing:
      return AgentStatus.Initializing;
    case AgentStatus.Error:
      return AgentStatus.Error;
    case AgentStatus.Idle:
      return AgentStatus.Idle;
    default:
      return AgentStatus.Offline;
  }
};

const rowAgentStatus = (row: RunHistoryTeamExecutionRow): AgentStatus => {
  if (row.memberKind !== 'agent') return AgentStatus.Offline;
  return normalizedAgentStatus(
    row.kind === 'stable_member' ? row.row.currentStatus : row.currentStatus,
  );
};

export const aggregateNestedTeamAgentStatus = (
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

  let aggregate = AgentStatus.Offline;
  for (let index = teamIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || row.depth <= teamRow.depth) break;

    const status = rowAgentStatus(row);
    if (statusRank[status] > statusRank[aggregate]) aggregate = status;
    if (aggregate === AgentStatus.Running) break;
  }
  return aggregate;
};
