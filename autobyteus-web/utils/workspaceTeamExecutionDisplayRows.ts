import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { TeamMemberFocusTarget, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';

export type WorkspaceTeamExecutionDisplayRowKind = 'stable_member' | 'transient_execution';
export type WorkspaceTransientExecutionKind = 'task_agent' | 'task_team' | 'task_team_child';

interface WorkspaceTeamExecutionDisplayRowBase extends TeamMemberFocusTarget {
  kind: WorkspaceTeamExecutionDisplayRowKind;
  memberKind: TeamMemberTreeRow['memberKind'];
  memberPath: string[];
  displayName: string;
  depth: number;
}

export interface WorkspaceStableMemberDisplayRow extends WorkspaceTeamExecutionDisplayRowBase {
  kind: 'stable_member';
  row: TeamMemberTreeRow;
}

export interface WorkspaceTransientExecutionDisplayRow extends WorkspaceTeamExecutionDisplayRowBase {
  kind: 'transient_execution';
  transientKind: WorkspaceTransientExecutionKind;
  currentStatus: AgentStatus | string | null;
}

export type WorkspaceTeamExecutionDisplayRow =
  | WorkspaceStableMemberDisplayRow
  | WorkspaceTransientExecutionDisplayRow;

export interface BuildWorkspaceTeamExecutionDisplayRowsParams {
  team: TeamTreeNode;
  teamContext?: AgentTeamContext | null;
}

const isTransientNode = (node: TeamMemberNode): boolean => Boolean(
  node.isTaskAgentInstance || node.isTaskTeamInstance || node.isTaskTeamChildProjection,
);

const transientKindForNode = (node: TeamMemberNode): WorkspaceTransientExecutionKind => {
  if (node.isTaskTeamInstance) return 'task_team';
  if (node.isTaskTeamChildProjection) return 'task_team_child';
  return 'task_agent';
};

const indexStableRows = (
  rows: readonly TeamMemberTreeRow[],
  target: Map<string, TeamMemberTreeRow> = new Map(),
): Map<string, TeamMemberTreeRow> => {
  for (const row of rows) {
    target.set(row.memberRouteKey, row);
    indexStableRows(row.children, target);
  }
  return target;
};

const flattenStableRows = (
  rows: readonly TeamMemberTreeRow[],
  depth = 0,
): WorkspaceStableMemberDisplayRow[] => rows.flatMap((row) => [
  {
    kind: 'stable_member' as const,
    teamRunId: row.teamRunId,
    memberRouteKey: row.memberRouteKey,
    memberKind: row.memberKind,
    memberPath: [...row.memberPath],
    displayName: row.displayName || row.memberName || row.memberRouteKey,
    depth,
    row,
  },
  ...flattenStableRows(row.children, depth + 1),
]);

const getLeafContextsByRouteKey = (
  teamContext: AgentTeamContext,
): AgentTeamContext['leafAgentContextsByRouteKey'] => {
  const candidate = teamContext.leafAgentContextsByRouteKey;
  if (candidate instanceof Map) {
    return candidate;
  }
  const legacyMembers = (teamContext as unknown as { members?: unknown }).members;
  return legacyMembers instanceof Map
    ? legacyMembers as AgentTeamContext['leafAgentContextsByRouteKey']
    : new Map();
};

const transientStatusForNode = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
): AgentStatus | string | null => {
  if (node.memberKind === 'agent') {
    return getLeafContextsByRouteKey(teamContext).get(node.memberRouteKey)?.state.currentStatus
      ?? node.currentStatus
      ?? AgentStatus.Initializing;
  }

  return node.currentStatus ?? AgentStatus.Initializing;
};

const buildTransientRow = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
  depth: number,
): WorkspaceTransientExecutionDisplayRow => {
  const pathDepth = Math.max(0, node.memberPath.length - 1);
  return {
    kind: 'transient_execution',
    transientKind: transientKindForNode(node),
    teamRunId: teamContext.teamRunId,
    memberRouteKey: node.memberRouteKey,
    memberKind: node.memberKind,
    memberPath: [...node.memberPath],
    displayName: node.displayName || node.memberName || node.memberRouteKey,
    currentStatus: transientStatusForNode(teamContext, node),
    depth: Math.max(depth, pathDepth),
  };
};

export const buildWorkspaceTeamExecutionDisplayRows = ({
  team,
  teamContext,
}: BuildWorkspaceTeamExecutionDisplayRowsParams): WorkspaceTeamExecutionDisplayRow[] => {
  const stableSourceRows = team.memberTree.length > 0 ? team.memberTree : team.members;
  if (!teamContext || !Array.isArray(teamContext.memberTree) || teamContext.memberTree.length === 0) {
    return flattenStableRows(stableSourceRows);
  }

  const stableRowsByRouteKey = indexStableRows(stableSourceRows);

  const visit = (
    nodes: readonly TeamMemberNode[],
    depth = 0,
  ): WorkspaceTeamExecutionDisplayRow[] => nodes.flatMap((node) => {
    if (isTransientNode(node)) {
      return [
        buildTransientRow(teamContext, node, depth),
        ...(node.memberKind === 'agent_team' ? visit(node.children, depth + 1) : []),
      ];
    }

    const stableRow = stableRowsByRouteKey.get(node.memberRouteKey);
    const stableDisplayRow = stableRow
      ? [{
        kind: 'stable_member' as const,
        teamRunId: stableRow.teamRunId,
        memberRouteKey: stableRow.memberRouteKey,
        memberKind: stableRow.memberKind,
        memberPath: [...stableRow.memberPath],
        displayName: stableRow.displayName || stableRow.memberName || stableRow.memberRouteKey,
        depth,
        row: stableRow,
      }]
      : [];

    return [
      ...stableDisplayRow,
      ...(node.memberKind === 'agent_team' ? visit(node.children, depth + 1) : []),
    ];
  });

  return visit(teamContext.memberTree);
};
