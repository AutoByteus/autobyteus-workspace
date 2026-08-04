import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

export type WorkspaceTeamExecutionDisplayRowKind = 'stable_member' | 'transient_execution';
export type WorkspaceTransientExecutionKind = 'task_agent' | 'task_team' | 'task_team_child';

interface WorkspaceTeamExecutionDisplayRowBase {
  rowKind: WorkspaceTeamExecutionDisplayRowKind;
  teamRunId: string;
  memberAddress: string;
  executionAddress: TeamExecutionAddress;
  memberKind: TeamMemberTreeRow['kind'];
  displayName: string;
  depth: number;
}

export interface WorkspaceStableMemberDisplayRow extends WorkspaceTeamExecutionDisplayRowBase {
  rowKind: 'stable_member';
  row: TeamMemberTreeRow;
}

export interface WorkspaceTransientExecutionDisplayRow extends WorkspaceTeamExecutionDisplayRowBase {
  rowKind: 'transient_execution';
  transientKind: WorkspaceTransientExecutionKind;
  currentStatus: AgentStatus | string | null;
}

export type WorkspaceTeamExecutionDisplayRow = WorkspaceStableMemberDisplayRow | WorkspaceTransientExecutionDisplayRow;
export interface BuildWorkspaceTeamExecutionDisplayRowsParams { team: TeamTreeNode; teamContext?: AgentTeamContext | null }

const transientKindForNode = (node: TeamMemberNode): WorkspaceTransientExecutionKind => {
  if (node.kind === 'agent_team' && node.executionAddress?.memberAddress === node.address) return 'task_team';
  if (node.kind === 'agent_team') return 'task_team_child';
  return 'task_agent';
};

const indexStableRows = (rows: readonly TeamMemberTreeRow[], target = new Map<string, TeamMemberTreeRow>()): Map<string, TeamMemberTreeRow> => {
  for (const row of rows) { target.set(row.memberAddress, row); indexStableRows(row.children, target); }
  return target;
};

const stableExecution = (teamRunId: string, memberAddress: string): TeamExecutionAddress =>
  createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress });

const flattenStableRows = (rows: readonly TeamMemberTreeRow[], depth = 0): WorkspaceStableMemberDisplayRow[] =>
  rows.flatMap((row) => [{
    rowKind: 'stable_member' as const,
    teamRunId: row.teamRunId,
    memberAddress: row.memberAddress,
    executionAddress: stableExecution(row.teamRunId, row.memberAddress),
    memberKind: row.kind,
    displayName: row.displayName || row.memberAddress,
    depth,
    row,
  }, ...flattenStableRows(row.children, depth + 1)]);

const buildTransientRow = (teamContext: AgentTeamContext, node: TeamMemberNode, depth: number): WorkspaceTransientExecutionDisplayRow => {
  const executionAddress = node.executionAddress
    ?? stableExecution(teamContext.teamRunId, node.address);
  const context = teamContext.agentExecutionsByKey.get(serializeTeamExecutionAddress(executionAddress));
  return {
    rowKind: 'transient_execution',
    transientKind: transientKindForNode(node),
    teamRunId: teamContext.teamRunId,
    memberAddress: node.address,
    executionAddress,
    memberKind: node.kind,
    displayName: node.displayName || node.address,
    currentStatus: node.kind === 'agent'
      ? context?.state.currentStatus ?? node.currentStatus ?? AgentStatus.Initializing
      : null,
    depth,
  };
};

export const buildWorkspaceTeamExecutionDisplayRows = ({ team, teamContext }: BuildWorkspaceTeamExecutionDisplayRowsParams): WorkspaceTeamExecutionDisplayRow[] => {
  const stableSourceRows = team.rootTeam.children.length > 0 ? team.rootTeam.children : team.members;
  if (!teamContext || teamContext.rootTeam.children.length === 0) return flattenStableRows(stableSourceRows);
  const stableRowsByAddress = indexStableRows(stableSourceRows);
  const visit = (nodes: readonly TeamMemberNode[], depth = 0): WorkspaceTeamExecutionDisplayRow[] => nodes.flatMap((node) => {
    if (node.isTaskExecution) {
      return [buildTransientRow(teamContext, node, depth), ...(node.kind === 'agent_team' ? visit(node.children, depth + 1) : [])];
    }
    const stableRow = stableRowsByAddress.get(node.address);
    return [
      ...(stableRow ? [{
        rowKind: 'stable_member' as const,
        teamRunId: stableRow.teamRunId,
        memberAddress: stableRow.memberAddress,
        executionAddress: stableExecution(stableRow.teamRunId, stableRow.memberAddress),
        memberKind: stableRow.kind,
        displayName: stableRow.displayName || stableRow.memberAddress,
        depth,
        row: stableRow,
      }] : []),
      ...(node.kind === 'agent_team' ? visit(node.children, depth + 1) : []),
    ];
  });
  return visit(teamContext.rootTeam.children);
};
