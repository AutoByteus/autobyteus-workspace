import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
  TeamMemberTreeRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const indexStableRows = (rows: readonly TeamMemberTreeRow[], target = new Map<string, TeamMemberTreeRow>()): Map<string, TeamMemberTreeRow> => {
  rows.forEach((row) => { target.set(row.memberAddress, row); indexStableRows(row.children, target); });
  return target;
};
const flattenStableRows = (rows: readonly TeamMemberTreeRow[], depth = 0): RunHistoryStableExecutionRow[] => rows.flatMap((row) => [{
  kind: 'stable_member' as const,
  teamRunId: row.teamRunId,
  memberAddress: row.memberAddress,
  executionAddress: createTeamExecutionAddress({ rootTeamRunId: row.teamRunId, memberAddress: row.memberAddress }),
  memberKind: row.kind,
  displayName: row.displayName || row.memberAddress,
  depth,
  hasChildren: row.children.length > 0,
  row,
}, ...flattenStableRows(row.children, depth + 1)]);

export const buildRunHistoryTeamExecutionRows = (team: TeamTreeNode, context?: AgentTeamContext | null): RunHistoryTeamExecutionRow[] => {
  const stableSource = team.rootTeam.children.length > 0 ? team.rootTeam.children : team.members;
  if (!context) return flattenStableRows(stableSource);
  const stableByAddress = indexStableRows(stableSource);
  return context.executions.listNavigationRows().flatMap((execution): RunHistoryTeamExecutionRow[] => {
    const topology = context.topology.getNode(execution.executionAddress.memberAddress);
    if (!topology) return [];
    if (execution.kind === 'persistent_agent' || execution.kind === 'persistent_team') {
      const stable = stableByAddress.get(execution.executionAddress.memberAddress);
      if (!stable) return [];
      return [{
        kind: 'stable_member', teamRunId: stable.teamRunId, memberAddress: stable.memberAddress,
        executionAddress: execution.executionAddress, memberKind: stable.kind,
        displayName: stable.displayName || execution.displayName, depth: execution.depth,
        hasChildren: execution.hasChildren || stable.children.length > 0, row: stable,
      }];
    }
    const transient: RunHistoryTransientExecutionRow = {
      kind: 'transient_execution',
      transientKind: execution.kind === 'task_agent' ? 'task_agent' : execution.kind === 'task_team' ? 'task_team' : 'task_team_child',
      teamRunId: context.executions.getRootTeamRunId(),
      memberAddress: execution.executionAddress.memberAddress,
      executionAddress: execution.executionAddress,
      memberKind: topology.kind,
      displayName: execution.displayName,
      currentStatus: execution.currentStatus,
      depth: execution.depth,
      hasChildren: execution.hasChildren,
    };
    return [transient];
  });
};
