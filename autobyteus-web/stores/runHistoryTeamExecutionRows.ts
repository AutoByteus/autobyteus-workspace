import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
  TeamMemberTreeRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

const transientKindForNode = (
  node: TeamMemberNode,
): RunHistoryTransientExecutionRow['transientKind'] => {
  if (node.executionAddress?.taskAgentRunId) return 'task_agent';
  if (node.kind === 'agent_team' && node.taskTargetKind === 'agent_team' && node.taskId) return 'task_team';
  return 'task_team_child';
};

const indexStableRows = (
  rows: readonly TeamMemberTreeRow[],
  target = new Map<string, TeamMemberTreeRow>(),
): Map<string, TeamMemberTreeRow> => {
  rows.forEach((row) => {
    target.set(row.memberAddress, row);
    indexStableRows(row.children, target);
  });
  return target;
};

const stableExecution = (teamRunId: string, memberAddress: string): TeamExecutionAddress =>
  createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress });

const flattenStableRows = (
  rows: readonly TeamMemberTreeRow[],
  depth = 0,
): RunHistoryStableExecutionRow[] => rows.flatMap((row) => [{
  kind: 'stable_member' as const,
  teamRunId: row.teamRunId,
  memberAddress: row.memberAddress,
  executionAddress: stableExecution(row.teamRunId, row.memberAddress),
  memberKind: row.kind,
  displayName: row.displayName || row.memberAddress,
  depth,
  hasChildren: row.children.length > 0,
  row,
}, ...flattenStableRows(row.children, depth + 1)]);

const transientStatusForNode = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
): AgentStatus | string | null => {
  if (node.kind !== 'agent') return null;
  const address = node.executionAddress ?? stableExecution(teamContext.teamRunId, node.address);
  return teamContext.agentExecutionsByKey.get(serializeTeamExecutionAddress(address))?.state.currentStatus
    ?? node.currentStatus
    ?? AgentStatus.Initializing;
};

const executionAddressForNode = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
): TeamExecutionAddress => node.executionAddress
  ?? stableExecution(teamContext.teamRunId, node.address);

export const buildRunHistoryTeamExecutionRows = (
  team: TeamTreeNode,
  teamContext?: AgentTeamContext | null,
): RunHistoryTeamExecutionRow[] => {
  const stableSourceRows = team.rootTeam.children.length > 0 ? team.rootTeam.children : team.members;
  if (!teamContext?.rootTeam.children.length) return flattenStableRows(stableSourceRows);
  const stableRowsByAddress = indexStableRows(stableSourceRows);

  const visit = (
    nodes: readonly TeamMemberNode[],
    depth = 0,
  ): RunHistoryTeamExecutionRow[] => nodes.flatMap((node) => {
    if (node.isTaskExecution) {
      const executionAddress = executionAddressForNode(teamContext, node);
      const row: RunHistoryTransientExecutionRow = {
        kind: 'transient_execution',
        transientKind: transientKindForNode(node),
        teamRunId: teamContext.teamRunId,
        memberAddress: node.address,
        executionAddress,
        memberKind: node.kind,
        displayName: node.displayName || node.address,
        currentStatus: transientStatusForNode(teamContext, node),
        depth,
        hasChildren: node.kind === 'agent_team' && node.children.length > 0,
      };
      return [row, ...(node.kind === 'agent_team' ? visit(node.children, depth + 1) : [])];
    }

    const stableRow = stableRowsByAddress.get(node.address);
    const current = stableRow ? [{
      kind: 'stable_member' as const,
      teamRunId: stableRow.teamRunId,
      memberAddress: stableRow.memberAddress,
      executionAddress: stableExecution(stableRow.teamRunId, stableRow.memberAddress),
      memberKind: stableRow.kind,
      displayName: stableRow.displayName || stableRow.memberAddress,
      depth,
      hasChildren: stableRow.children.length > 0 || (node.kind === 'agent_team' && node.children.length > 0),
      row: stableRow,
    }] : [];
    return [...current, ...(node.kind === 'agent_team' ? visit(node.children, depth + 1) : [])];
  });

  const rows = visit(teamContext.rootTeam.children);
  return rows.map((row, index) => {
    const next = rows[index + 1];
    const hasChildren = row.hasChildren || Boolean(next && next.depth > row.depth);
    return hasChildren === row.hasChildren ? row : { ...row, hasChildren };
  });
};
