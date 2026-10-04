import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { projectWorkspaceHistoryByWorkspace } from '~/utils/runTreeProjection';
import type {
  AgentOrgRunHistoryItem,
  RunHistoryWorkspaceGroup,
  TeamTreeNode,
  TeamMemberTreeRow,
  RunHistoryTeamExecutionRow,
  WorkspaceHistoryWorkspaceNode,
} from './runHistoryTypes';
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

export interface RunHistoryAgentOrgNavigationAncestry {
  workspaceId: string;
  definitionId: string;
  teamAddresses: string[];
}

export interface RunHistoryNavigationProjectionState {
  workspaceNodes: WorkspaceHistoryWorkspaceNode[];
  teamNodes: TeamTreeNode[];
  teamNodesByWorkspaceRoot: Record<string, TeamTreeNode[]>;
  runIndexById: Record<string, { workspaceIndex: number; agentIndex: number; runIndex: number }>;
  teamIndexById: Record<string, { index: number; workspaceRootPath: string; workspaceIndex: number }>;
  memberIndexByIdentity: Record<string, number>;
  runAncestryById: Record<string, RunHistoryAgentNavigationAncestry>;
  teamAncestryById: Record<string, RunHistoryTeamNavigationAncestry>;
  agentOrgAncestryById: Record<string, RunHistoryAgentOrgNavigationAncestry>;
  memberAncestorExecutionKeysByIdentity: Record<string, string[]>;
}

export interface RunHistoryNavigationProjectionBuildInput {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentAvatarByDefinitionId: Record<string, string>;
  allWorkspaces: Parameters<typeof buildRunHistoryTreeNodes>[0]['allWorkspaces'];
  workspacesById: Parameters<typeof buildRunHistoryTreeNodes>[0]['workspacesById'];
  agentContexts: Map<string, AgentContext>;
  teamContexts: AgentTeamContext[];
  agentOrgHistory: AgentOrgRunHistoryItem[];
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
  equals: (left: T, right: T) => boolean,
): T[] => {
  const previousByKey = new Map(previous.map((node) => [keyOf(node), node]));
  const reconciled = next.map((node) => {
    const prior = previousByKey.get(keyOf(node));
    return prior && equals(prior, node) ? prior : node;
  });
  return previous.length === reconciled.length && previous.every(
    (node, index) => node === reconciled[index],
  ) ? previous as T[] : reconciled;
};

const equalRows = <T>(left: readonly T[], right: readonly T[], equals: (a: T, b: T) => boolean): boolean =>
  left.length === right.length && left.every((row, index) => equals(row, right[index]!));

const equalWorkspace = (a: WorkspaceHistoryWorkspaceNode, b: WorkspaceHistoryWorkspaceNode): boolean =>
  a.stableKey === b.stableKey && a.workspaceId === b.workspaceId && a.workspaceRootPath === b.workspaceRootPath
  && a.workspaceName === b.workspaceName && a.workspaceKind === b.workspaceKind
  && a.canRemoveFromWorkspaces === b.canRemoveFromWorkspaces
  && equalRows(a.agents, b.agents, (a, b) => a.agentDefinitionId === b.agentDefinitionId
    && a.agentName === b.agentName && a.agentAvatarUrl === b.agentAvatarUrl
    && equalRows(a.runs, b.runs, (a, b) => a.runId === b.runId && a.summary === b.summary
      && a.lastActivityAt === b.lastActivityAt && a.currentStatus === b.currentStatus
      && a.lastKnownStatus === b.lastKnownStatus && a.isActive === b.isActive
      && a.hasCollaboration === b.hasCollaboration && a.source === b.source && a.isDraft === b.isDraft))
  && equalRows(a.agentOrgDefinitions, b.agentOrgDefinitions, (a, b) => a.stableKey === b.stableKey
    && a.definitionId === b.definitionId && a.name === b.name && equalRows(a.runs, b.runs, (a, b) => a === b));

const equalTeamMember = (a: TeamMemberTreeRow, b: TeamMemberTreeRow): boolean =>
  a.teamRunId === b.teamRunId && a.kind === b.kind && a.memberAddress === b.memberAddress
  && a.displayName === b.displayName && a.agentRunId === b.agentRunId && a.teamDefinitionId === b.teamDefinitionId
  && a.teamRunIdForNode === b.teamRunIdForNode && a.coordinatorAddress === b.coordinatorAddress
  && a.workspaceRootPath === b.workspaceRootPath && a.summary === b.summary
  && a.lastActivityAt === b.lastActivityAt && a.currentStatus === b.currentStatus
  && a.isActive === b.isActive && a.deleteLifecycle === b.deleteLifecycle
  && equalRows(a.children, b.children, equalTeamMember);

const equalTeamExecution = (a: RunHistoryTeamExecutionRow, b: RunHistoryTeamExecutionRow): boolean => {
  if (a.kind !== b.kind || a.teamRunId !== b.teamRunId || a.memberAddress !== b.memberAddress
    || a.agentRunId !== b.agentRunId || a.teamRunIdForNode !== b.teamRunIdForNode
    || a.rowKey !== b.rowKey || a.memberKind !== b.memberKind || a.displayName !== b.displayName
    || a.depth !== b.depth || a.hasChildren !== b.hasChildren) return false;
  if (a.kind === 'stable_member' && b.kind === 'stable_member') return equalTeamMember(a.row, b.row);
  return a.kind === 'transient_execution' && b.kind === 'transient_execution'
    && a.transientKind === b.transientKind && a.currentStatus === b.currentStatus
    && a.delegatedBy === b.delegatedBy && a.opensOnAppear === b.opensOnAppear;
};

const equalTeam = (a: TeamTreeNode, b: TeamTreeNode): boolean =>
  a.teamRunId === b.teamRunId && a.teamDefinitionId === b.teamDefinitionId
  && a.teamDefinitionName === b.teamDefinitionName && a.workspaceRootPath === b.workspaceRootPath
  && a.summary === b.summary && a.lastActivityAt === b.lastActivityAt && a.isActive === b.isActive
  && a.deleteLifecycle === b.deleteLifecycle && a.focusedAgentRunId === b.focusedAgentRunId
  && equalTeamMember(a.rootTeam, b.rootTeam) && equalRows(a.members, b.members, equalTeamMember)
  && equalRows(a.executionRows, b.executionRows, equalTeamExecution);

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
  const establishedWorkspaceNodes = buildRunHistoryTreeNodes({
    workspaceGroups: input.workspaceGroups,
    agentAvatarByDefinitionId: input.agentAvatarByDefinitionId,
    allWorkspaces: input.allWorkspaces,
    workspacesById: input.workspacesById,
    agentContexts: input.agentContexts,
  });
  const builtWorkspaceNodes = projectWorkspaceHistoryByWorkspace(
    establishedWorkspaceNodes,
    input.agentOrgHistory,
  );
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
    ? retainEqualNodes(previous.workspaceNodes, builtWorkspaceNodes, (node) => node.workspaceId, equalWorkspace)
    : builtWorkspaceNodes;
  const teamNodes = previous
    ? retainEqualNodes(previous.teamNodes, completedTeamNodes, (node) => node.teamRunId, equalTeam)
    : completedTeamNodes;
  const runIndexById: RunHistoryNavigationProjectionState['runIndexById'] = {};
  const runAncestryById: RunHistoryNavigationProjectionState['runAncestryById'] = {};
  const agentOrgAncestryById: RunHistoryNavigationProjectionState['agentOrgAncestryById'] = {};
  workspaceNodes.forEach((workspace, workspaceIndex) => workspace.agents.forEach(
    (agent, agentIndex) => agent.runs.forEach((run, runIndex) => {
      runIndexById[run.runId] = { workspaceIndex, agentIndex, runIndex };
      runAncestryById[run.runId] = {
        workspaceId: workspace.stableKey,
        agentDefinitionId: agent.agentDefinitionId,
      };
    }),
  ));
  workspaceNodes.forEach((workspace) => (workspace.agentOrgDefinitions ?? []).forEach((definition) => {
    definition.runs.forEach((run) => {
      agentOrgAncestryById[run.rootRunId] = {
        workspaceId: workspace.stableKey,
        definitionId: definition.definitionId,
        teamAddresses: run.executionTree.rootOrg.members
          .filter((member) => 'teamRunId' in member)
          .map((member) => member.address),
      };
    });
  }));
  const workspacePresentationIdByRootPath = new Map(
    workspaceNodes.map((workspace) => [normalizeRootPath(workspace.workspaceRootPath), workspace.stableKey]),
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
    const workspaceId = workspacePresentationIdByRootPath.get(normalizeRootPath(team.workspaceRootPath));
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
    agentOrgAncestryById,
    memberAncestorExecutionKeysByIdentity,
  };
};
