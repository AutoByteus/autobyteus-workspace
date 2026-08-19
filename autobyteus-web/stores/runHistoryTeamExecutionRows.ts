import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
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

export const buildRunHistoryTeamExecutionRows = (
  team: TeamTreeNode,
  context?: AgentTeamContext | null,
): RunHistoryTeamExecutionRow[] => {
  const stableSource = team.rootTeam.children.length > 0 ? team.rootTeam.children : team.members;
  if (!context) return flattenStableRows(stableSource);
  const rootTeamRunId = context.view.getRootTeamRunId();
  if (team.teamRunId !== rootTeamRunId) {
    throw new Error(`Team history root '${team.teamRunId}' does not match execution root '${rootTeamRunId}'.`);
  }
  const navigationRows = context.view.listNavigationRows();
  const rootRowKey = `team:${rootTeamRunId}`;
  const rootRows = navigationRows.filter((row) => row.key === rootRowKey);
  const rootRow = rootRows[0];
  if (
    rootRows.length !== 1
    || rootRow?.kind !== 'configured_team'
    || rootRow.teamRunId !== rootTeamRunId
    || rootRow.address !== '/'
    || rootRow.depth !== 0
    || rootRow.parentKey !== null
  ) {
    throw new Error(`Team history execution root '${rootTeamRunId}' is invalid.`);
  }
  const descendantRows = navigationRows.filter((row) => row !== rootRow);
  const parentRowKeys = new Set(descendantRows.flatMap((row) => row.parentKey ? [row.parentKey] : []));
  const stableByKey = new Map(flattenStableRows(stableSource).map((row) => [row.rowKey, row]));
  return descendantRows.flatMap((execution): RunHistoryTeamExecutionRow[] => {
    if (execution.depth < 1) {
      throw new Error(`Team history descendant '${execution.key}' is outside execution root '${rootTeamRunId}'.`);
    }
    const depth = execution.depth - 1;
    const hasChildren = execution.expandable || parentRowKeys.has(execution.key);
    const stable = stableByKey.get(execution.key);
    if (execution.kind === 'configured_agent' || execution.kind === 'configured_team') {
      if (!stable) {
        throw new Error(`Configured Team history row '${execution.key}' is absent from root '${rootTeamRunId}'.`);
      }
      return [{
        ...stable,
        displayName: execution.displayName || stable.displayName,
        depth,
        hasChildren: hasChildren || stable.hasChildren,
      }];
    }
    const transientKind = execution.kind === 'task_agent'
      ? 'task_agent'
      : execution.kind === 'task_team'
        ? 'task_team'
        : 'task_team_child';
    const transient: RunHistoryTransientExecutionRow = {
      kind: 'transient_execution',
      transientKind,
      rowKey: execution.key,
      teamRunId: context.view.getRootTeamRunId(),
      memberAddress: execution.address,
      agentRunId: execution.agentRunId,
      teamRunIdForNode: execution.teamRunId,
      memberKind: execution.agentRunId ? 'agent' : 'agent_team',
      displayName: execution.displayName,
      currentStatus: execution.currentStatus,
      depth,
      hasChildren,
    };
    return [transient];
  });
};
