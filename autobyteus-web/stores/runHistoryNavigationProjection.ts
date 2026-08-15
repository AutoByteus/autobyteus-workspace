import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';
import type { RunHistoryWorkspaceGroup, TeamTreeNode } from './runHistoryTypes';
import {
  buildRunHistoryTeamNodes,
  buildRunHistoryTreeNodes,
  normalizeRootPath,
} from './runHistoryReadModel';
import { buildRunHistoryTeamExecutionRows } from './runHistoryTeamExecutionRows';

export interface RunHistoryAgentNavigationAncestry {
  workspaceId: string;
  agentDefinitionId: string;
}

export interface RunHistoryTeamNavigationAncestry {
  workspaceId: string;
  teamDefinitionGroupKey: string;
}

export interface RunHistoryNavigationProjectionState {
  workspaceNodes: RunTreeWorkspaceNode[];
  teamNodes: TeamTreeNode[];
  teamNodesByWorkspaceRoot: Record<string, TeamTreeNode[]>;
  runIndexById: Record<string, { workspaceIndex: number; agentIndex: number; runIndex: number }>;
  teamIndexById: Record<string, { index: number; workspaceRootPath: string; workspaceIndex: number }>;
  memberIndexByIdentity: Record<string, number>;
  runAncestryById: Record<string, RunHistoryAgentNavigationAncestry>;
  teamAncestryById: Record<string, RunHistoryTeamNavigationAncestry>;
  memberAncestorExecutionKeysByIdentity: Record<string, string[]>;
}

export interface RunHistoryNavigationProjectionBuildInput {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentAvatarByDefinitionId: Record<string, string>;
  allWorkspaces: Parameters<typeof buildRunHistoryTreeNodes>[0]['allWorkspaces'];
  workspacesById: Parameters<typeof buildRunHistoryTreeNodes>[0]['workspacesById'];
  agentContexts: Map<string, AgentContext>;
  teamContexts: AgentTeamContext[];
}

export const runHistoryExecutionRowIndexKey = (teamRunId: string, rowKey: string): string =>
  `${teamRunId}\u0000${rowKey}`;

export const runHistoryMemberIndexKey = (teamRunId: string, agentRunId: string): string =>
  runHistoryExecutionRowIndexKey(teamRunId, `agent:${agentRunId.trim()}`);

const teamDefinitionGroupKey = (
  team: TeamTreeNode,
  workspaceGroups: RunHistoryWorkspaceGroup[],
): string => {
  const historyWorkspace = workspaceGroups.find((workspace) =>
    normalizeRootPath(workspace.workspaceRootPath) === normalizeRootPath(team.workspaceRootPath));
  const historyGroup = historyWorkspace?.teamDefinitions.find((group) =>
    group.runs.some((run) => run.teamRunId === team.teamRunId));
  return historyGroup?.teamDefinitionId.trim()
    || historyGroup?.teamDefinitionName.trim()
    || team.teamDefinitionId.trim()
    || team.teamDefinitionName.trim()
    || team.teamRunId;
};

const retainEqualNodes = <T extends object>(
  previous: readonly T[],
  next: readonly T[],
  keyOf: (node: T) => string,
): T[] => {
  const previousByKey = new Map(previous.map((node) => [keyOf(node), node]));
  const reconciled = next.map((node) => {
    const prior = previousByKey.get(keyOf(node));
    return prior && JSON.stringify(prior) === JSON.stringify(node) ? prior : node;
  });
  return previous.length === reconciled.length && previous.every(
    (node, index) => node === reconciled[index],
  ) ? previous as T[] : reconciled;
};

const retainEqualWorkspaceTeamBuckets = (
  previous: Readonly<Record<string, TeamTreeNode[]>> | null | undefined,
  next: Record<string, TeamTreeNode[]>,
): Record<string, TeamTreeNode[]> => {
  if (!previous) return next;
  const nextKeys = Object.keys(next);
  const reconciled = Object.fromEntries(nextKeys.map((key) => {
    const prior = previous[key];
    const bucket = next[key]!;
    const retained = prior?.length === bucket.length && prior.every(
      (team, index) => team === bucket[index],
    ) ? prior : bucket;
    return [key, retained];
  }));
  const previousKeys = Object.keys(previous);
  return previousKeys.length === nextKeys.length && nextKeys.every(
    (key) => previous[key] === reconciled[key],
  ) ? previous as Record<string, TeamTreeNode[]> : reconciled;
};

export const buildRunHistoryNavigationProjection = (
  input: RunHistoryNavigationProjectionBuildInput,
  previous?: RunHistoryNavigationProjectionState | null,
): RunHistoryNavigationProjectionState => {
  const builtWorkspaceNodes = buildRunHistoryTreeNodes({
    workspaceGroups: input.workspaceGroups,
    agentAvatarByDefinitionId: input.agentAvatarByDefinitionId,
    allWorkspaces: input.allWorkspaces,
    workspacesById: input.workspacesById,
    agentContexts: input.agentContexts,
  });
  const builtTeamNodes = buildRunHistoryTeamNodes({
    workspaceGroups: input.workspaceGroups,
    teamContexts: input.teamContexts,
    workspacesById: input.workspacesById,
  });
  const teamContextById = new Map(input.teamContexts.map((context) => [context.view.getRootTeamRunId(), context]));
  const completedTeamNodes = builtTeamNodes.map((team) => {
    const context = teamContextById.get(team.teamRunId) ?? null;
    const focused = {
      ...team,
      focusedAgentRunId: context?.view.getFocusedAgentRunId() ?? team.focusedAgentRunId,
    };
    return { ...focused, executionRows: buildRunHistoryTeamExecutionRows(focused, context) };
  });
  const workspaceNodes = previous
    ? retainEqualNodes(previous.workspaceNodes, builtWorkspaceNodes, (node) => node.workspaceId)
    : builtWorkspaceNodes;
  const teamNodes = previous
    ? retainEqualNodes(previous.teamNodes, completedTeamNodes, (node) => node.teamRunId)
    : completedTeamNodes;
  const runIndexById: RunHistoryNavigationProjectionState['runIndexById'] = {};
  const runAncestryById: RunHistoryNavigationProjectionState['runAncestryById'] = {};
  workspaceNodes.forEach((workspace, workspaceIndex) => workspace.agents.forEach(
    (agent, agentIndex) => agent.runs.forEach((run, runIndex) => {
      runIndexById[run.runId] = { workspaceIndex, agentIndex, runIndex };
      runAncestryById[run.runId] = {
        workspaceId: workspace.workspaceId,
        agentDefinitionId: agent.agentDefinitionId,
      };
    }),
  ));
  const workspaceIdByRootPath = new Map(
    workspaceNodes.map((workspace) => [normalizeRootPath(workspace.workspaceRootPath), workspace.workspaceId]),
  );
  const builtTeamNodesByWorkspaceRoot: Record<string, TeamTreeNode[]> = {};
  const teamIndexById: RunHistoryNavigationProjectionState['teamIndexById'] = {};
  const memberIndexByIdentity: Record<string, number> = {};
  const teamAncestryById: RunHistoryNavigationProjectionState['teamAncestryById'] = {};
  const memberAncestorExecutionKeysByIdentity: Record<string, string[]> = {};
  teamNodes.forEach((team, index) => {
    const rows = builtTeamNodesByWorkspaceRoot[team.workspaceRootPath] ?? [];
    teamIndexById[team.teamRunId] = {
      index,
      workspaceRootPath: team.workspaceRootPath,
      workspaceIndex: rows.length,
    };
    const workspaceId = workspaceIdByRootPath.get(normalizeRootPath(team.workspaceRootPath));
    if (workspaceId) {
      teamAncestryById[team.teamRunId] = {
        workspaceId,
        teamDefinitionGroupKey: teamDefinitionGroupKey(team, input.workspaceGroups),
      };
    }
    const expandableAncestorByDepth: Array<string | undefined> = [];
    team.executionRows.forEach((row, rowIndex) => {
      const identity = runHistoryExecutionRowIndexKey(team.teamRunId, row.rowKey);
      memberIndexByIdentity[identity] = rowIndex;
      memberAncestorExecutionKeysByIdentity[identity] = expandableAncestorByDepth
        .slice(0, row.depth)
        .filter((key): key is string => Boolean(key));
      expandableAncestorByDepth[row.depth] = row.hasChildren ? row.rowKey : undefined;
      expandableAncestorByDepth.length = row.depth + 1;
    });
    builtTeamNodesByWorkspaceRoot[team.workspaceRootPath] = [...rows, team];
  });
  const teamNodesByWorkspaceRoot = retainEqualWorkspaceTeamBuckets(
    previous?.teamNodesByWorkspaceRoot,
    builtTeamNodesByWorkspaceRoot,
  );
  return {
    workspaceNodes,
    teamNodes,
    teamNodesByWorkspaceRoot,
    runIndexById,
    teamIndexById,
    memberIndexByIdentity,
    runAncestryById,
    teamAncestryById,
    memberAncestorExecutionKeysByIdentity,
  };
};
