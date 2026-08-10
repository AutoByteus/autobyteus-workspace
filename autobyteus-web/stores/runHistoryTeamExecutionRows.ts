import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
  TeamMemberTreeRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';

const isTransientNode = (node: TeamMemberNode): boolean => Boolean(
  node.isTaskAgentInstance || node.isTaskTeamInstance || node.isTaskTeamChildProjection,
);

const transientKindForNode = (
  node: TeamMemberNode,
): RunHistoryTransientExecutionRow['transientKind'] => {
  if (node.isTaskTeamInstance) return 'task_team';
  if (node.isTaskTeamChildProjection) return 'task_team_child';
  return 'task_agent';
};

const indexStableRows = (
  rows: readonly TeamMemberTreeRow[],
  target = new Map<string, TeamMemberTreeRow>(),
): Map<string, TeamMemberTreeRow> => {
  rows.forEach((row) => {
    target.set(row.memberRouteKey, row);
    indexStableRows(row.children, target);
  });
  return target;
};

const flattenStableRows = (
  rows: readonly TeamMemberTreeRow[],
  depth = 0,
): RunHistoryStableExecutionRow[] => rows.flatMap((row) => [{
  kind: 'stable_member' as const,
  teamRunId: row.teamRunId,
  memberRouteKey: row.memberRouteKey,
  memberKind: row.memberKind,
  memberPath: [...row.memberPath],
  displayName: row.displayName || row.memberName || row.memberRouteKey,
  depth,
  hasChildren: row.children.length > 0,
  row,
}, ...flattenStableRows(row.children, depth + 1)]);

const transientStatusForNode = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
): AgentStatus | string | null => {
  if (node.memberKind !== 'agent') return null;
  return teamContext.leafAgentContextsByRouteKey.get(node.memberRouteKey)?.state.currentStatus
    ?? node.currentStatus
    ?? AgentStatus.Initializing;
};

export const buildRunHistoryTeamExecutionRows = (
  team: TeamTreeNode,
  teamContext?: AgentTeamContext | null,
): RunHistoryTeamExecutionRow[] => {
  const stableSourceRows = team.memberTree.length > 0 ? team.memberTree : team.members;
  if (!teamContext?.memberTree?.length) return flattenStableRows(stableSourceRows);
  const stableRowsByRouteKey = indexStableRows(stableSourceRows);

  const visit = (
    nodes: readonly TeamMemberNode[],
    depth = 0,
  ): RunHistoryTeamExecutionRow[] => nodes.flatMap((node) => {
    if (isTransientNode(node)) {
      const pathDepth = Math.max(0, node.memberPath.length - 1);
      const row: RunHistoryTransientExecutionRow = {
        kind: 'transient_execution',
        transientKind: transientKindForNode(node),
        teamRunId: teamContext.teamRunId,
        memberRouteKey: node.memberRouteKey,
        memberKind: node.memberKind,
        memberPath: [...node.memberPath],
        displayName: node.displayName || node.memberName || node.memberRouteKey,
        currentStatus: transientStatusForNode(teamContext, node),
        depth: Math.max(depth, pathDepth),
        hasChildren: node.memberKind === 'agent_team' && node.children.length > 0,
      };
      return [row, ...(node.memberKind === 'agent_team' ? visit(node.children, depth + 1) : [])];
    }

    const stableRow = stableRowsByRouteKey.get(node.memberRouteKey);
    const current = stableRow ? [{
      kind: 'stable_member' as const,
      teamRunId: stableRow.teamRunId,
      memberRouteKey: stableRow.memberRouteKey,
      memberKind: stableRow.memberKind,
      memberPath: [...stableRow.memberPath],
      displayName: stableRow.displayName || stableRow.memberName || stableRow.memberRouteKey,
      depth,
      hasChildren: stableRow.children.length > 0 || (node.memberKind === 'agent_team' && node.children.length > 0),
      row: stableRow,
    }] : [];
    return [...current, ...(node.memberKind === 'agent_team' ? visit(node.children, depth + 1) : [])];
  });

  const rows = visit(teamContext.memberTree);
  return rows.map((row, index) => {
    const next = rows[index + 1];
    const hasChildren = row.hasChildren || Boolean(next && next.depth > row.depth);
    return hasChildren === row.hasChildren ? row : { ...row, hasChildren };
  });
};
