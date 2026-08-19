import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunNavigationEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';
import type { RunHistoryTeamExecutionRow, TeamTreeNode } from './runHistoryTypes';
import {
  runHistoryExecutionRowIndexKey,
  runHistoryMemberIndexKey,
  type RunHistoryNavigationProjectionState,
} from './runHistoryNavigationProjection';

export type RunNavigationTarget =
  | { kind: 'standalone'; runId: string; currentStatus: AgentStatus; summary?: string }
  | {
      kind: 'team_member';
      teamRunId: string;
      agentRunId: string;
      currentStatus: AgentStatus;
      summary?: string;
    }
  | { kind: 'team_run'; teamRunId: string; isActive: boolean };

export type TaskExecutionRowPresentationChange =
  | { field: 'DISPLAY_NAME'; value: string }
  | { field: 'CURRENT_STATUS'; value: AgentStatus | string | null };

const statusIsActive = (status: AgentStatus | string | null): boolean =>
  status !== AgentStatus.Offline && status !== AgentStatus.Error;

const sameActivityBucket = (left: string, right: string): boolean => {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime)
    ? Math.floor(leftTime / 60_000) === Math.floor(rightTime / 60_000)
    : left === right;
};

const replaceTeam = (
  state: RunHistoryNavigationProjectionState,
  team: TeamTreeNode,
): RunHistoryNavigationProjectionState => {
  const index = state.teamIndexById[team.teamRunId];
  if (!index) return state;
  const teamNodes = [...state.teamNodes];
  teamNodes[index.index] = team;
  const workspaceRows = [...(state.teamNodesByWorkspaceRoot[index.workspaceRootPath] ?? [])];
  workspaceRows[index.workspaceIndex] = team;
  return {
    ...state,
    teamNodes,
    teamNodesByWorkspaceRoot: {
      ...state.teamNodesByWorkspaceRoot,
      [index.workspaceRootPath]: workspaceRows,
    },
  };
};

const patchStandalone = (
  state: RunHistoryNavigationProjectionState,
  target: Extract<RunNavigationTarget, { kind: 'standalone' }>,
  effect: Exclude<RunNavigationEffect, { kind: 'NONE' }>,
): RunHistoryNavigationProjectionState => {
  const index = state.runIndexById[target.runId];
  if (!index) return state;
  const workspace = state.workspaceNodes[index.workspaceIndex];
  const agent = workspace?.agents[index.agentIndex];
  const run = agent?.runs[index.runIndex];
  if (!workspace || !agent || !run) return state;
  const occurredAt = effect.occurredAt;
  const activityChanged = Boolean(
    occurredAt && !sameActivityBucket(run.lastActivityAt, occurredAt),
  );
  if (effect.kind === 'ACTIVITY' && !activityChanged) return state;
  const candidate = effect.kind === 'ACTIVITY'
    ? { ...run, lastActivityAt: occurredAt! }
    : {
        ...run,
        currentStatus: target.currentStatus,
        isActive: statusIsActive(target.currentStatus),
        ...(target.summary === undefined ? {} : { summary: target.summary }),
        ...(activityChanged ? { lastActivityAt: occurredAt } : {}),
      };
  if (JSON.stringify(candidate) === JSON.stringify(run)) return state;
  const runs = [...agent.runs];
  runs[index.runIndex] = candidate;
  const agents = [...workspace.agents];
  agents[index.agentIndex] = { ...agent, runs };
  const workspaceNodes: RunTreeWorkspaceNode[] = [...state.workspaceNodes];
  workspaceNodes[index.workspaceIndex] = { ...workspace, agents };
  return { ...state, workspaceNodes };
};

const patchExecutionRowStatus = (
  row: RunHistoryTeamExecutionRow,
  currentStatus: AgentStatus | string | null,
): RunHistoryTeamExecutionRow => row.kind === 'transient_execution'
  ? { ...row, currentStatus }
  : {
      ...row,
      row: {
        ...row.row,
        currentStatus: currentStatus as AgentStatus | null,
        isActive: statusIsActive(currentStatus),
      },
    };

const patchTeamMember = (
  state: RunHistoryNavigationProjectionState,
  target: Extract<RunNavigationTarget, { kind: 'team_member' }>,
  effect: Exclude<RunNavigationEffect, { kind: 'NONE' }>,
): RunHistoryNavigationProjectionState => {
  const teamIndex = state.teamIndexById[target.teamRunId];
  if (!teamIndex) return state;
  const team = state.teamNodes[teamIndex.index];
  if (!team) return state;
  if (effect.kind === 'ACTIVITY') {
    if (sameActivityBucket(team.lastActivityAt, effect.occurredAt)) return state;
    return replaceTeam(state, { ...team, lastActivityAt: effect.occurredAt });
  }
  const rowIndex = state.memberIndexByIdentity[
    runHistoryMemberIndexKey(target.teamRunId, target.agentRunId)
  ];
  const row = rowIndex === undefined ? null : team.executionRows[rowIndex] ?? null;
  const nextRow = row ? patchExecutionRowStatus(row, target.currentStatus) : null;
  const rowChanged = Boolean(row && nextRow && JSON.stringify(nextRow) !== JSON.stringify(row));
  const occurredAt = effect.occurredAt;
  const activityChanged = Boolean(
    occurredAt && !sameActivityBucket(team.lastActivityAt, occurredAt),
  );
  const summaryChanged = target.summary !== undefined && target.summary !== team.summary;
  if (!rowChanged && !activityChanged && !summaryChanged) return state;
  const executionRows = rowChanged ? [...team.executionRows] : team.executionRows;
  if (rowChanged && rowIndex !== undefined && nextRow) executionRows[rowIndex] = nextRow;
  return replaceTeam(state, {
    ...team,
    executionRows,
    ...(summaryChanged ? { summary: target.summary! } : {}),
    ...(activityChanged ? { lastActivityAt: occurredAt! } : {}),
  });
};

const patchTeamRun = (
  state: RunHistoryNavigationProjectionState,
  target: Extract<RunNavigationTarget, { kind: 'team_run' }>,
): RunHistoryNavigationProjectionState => {
  const teamIndex = state.teamIndexById[target.teamRunId];
  const team = teamIndex ? state.teamNodes[teamIndex.index] : null;
  if (!team || team.isActive === target.isActive) return state;
  return replaceTeam(state, { ...team, isActive: target.isActive });
};

export const applyRunNavigationEffectToProjection = (
  state: RunHistoryNavigationProjectionState,
  target: RunNavigationTarget,
  effect: RunNavigationEffect,
): { state: RunHistoryNavigationProjectionState; changed: boolean } => {
  if (effect.kind === 'NONE') return { state, changed: false };
  const next = target.kind === 'standalone'
    ? patchStandalone(state, target, effect)
    : target.kind === 'team_member'
      ? patchTeamMember(state, target, effect)
      : patchTeamRun(state, target);
  return { state: next, changed: next !== state };
};

export const applyRunNavigationTeamFocusToProjection = (
  state: RunHistoryNavigationProjectionState,
  teamRunId: string,
  agentRunId: string,
): { state: RunHistoryNavigationProjectionState; changed: boolean } => {
  const index = state.teamIndexById[teamRunId];
  const team = index ? state.teamNodes[index.index] : null;
  if (!team || team.focusedAgentRunId === agentRunId) return { state, changed: false };
  const next = replaceTeam(state, { ...team, focusedAgentRunId: agentRunId });
  return { state: next, changed: next !== state };
};

export const applyTaskExecutionRowPresentationToProjection = (
  state: RunHistoryNavigationProjectionState,
  teamRunId: string,
  rowKey: string,
  changes: readonly TaskExecutionRowPresentationChange[],
): { state: RunHistoryNavigationProjectionState; changed: boolean } => {
  const teamIndex = state.teamIndexById[teamRunId];
  const team = teamIndex ? state.teamNodes[teamIndex.index] : null;
  const rowIndex = state.memberIndexByIdentity[runHistoryExecutionRowIndexKey(teamRunId, rowKey)];
  const current = team && rowIndex !== undefined ? team.executionRows[rowIndex] : null;
  if (!team || rowIndex === undefined || !current) return { state, changed: false };
  let row = current;
  for (const change of changes) {
    row = change.field === 'DISPLAY_NAME'
      ? { ...row, displayName: change.value }
      : patchExecutionRowStatus(row, change.value);
  }
  if (JSON.stringify(row) === JSON.stringify(current)) return { state, changed: false };
  const executionRows = [...team.executionRows];
  executionRows[rowIndex] = row;
  const next = replaceTeam(state, { ...team, executionRows });
  return { state: next, changed: next !== state };
};
