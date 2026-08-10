import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunNavigationEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
import {
  applyRunNavigationEffectToProjection,
  applyRunNavigationTeamFocusToProjection,
  applyTaskExecutionRowPresentationToProjection,
} from '../runHistoryNavigationPatches';
import {
  buildRunHistoryNavigationProjection,
  runHistoryMemberIndexKey,
} from '../runHistoryNavigationProjection';

const timestamp = '2026-07-01T10:00:15.000Z';

const buildAgentContext = (runId: string, workspaceRootPath: string, status = AgentStatus.Idle) => ({
  config: {
    agentDefinitionId: `${runId}-definition`,
    agentDefinitionName: runId,
    workspaceId: null,
    workspaceMetadata: { workspaceRootPath },
  },
  state: {
    runId,
    currentStatus: status,
    conversation: {
      id: runId,
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  },
});

const buildTeamContext = (
  teamRunId: string,
  workspaceRootPath: string,
  taskStatus = AgentStatus.Running,
) => {
  const worker = buildAgentContext(`${teamRunId}-worker-run`, workspaceRootPath);
  const taskAgent = buildAgentContext(`${teamRunId}-task-run`, workspaceRootPath, taskStatus);
  const workerNode = {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'Worker',
    memberPath: ['worker'],
    memberRouteKey: 'worker',
    memberRunId: worker.state.runId,
    agentDefinitionId: worker.config.agentDefinitionId,
  };
  const taskNode = {
    memberKind: 'agent',
    memberName: 'worker · task_0001',
    displayName: 'Worker · task_0001',
    memberPath: ['worker', `${teamRunId}-task-run`],
    memberRouteKey: `${teamRunId}-task-run`,
    memberRunId: `${teamRunId}-task-run`,
    agentDefinitionId: worker.config.agentDefinitionId,
    currentStatus: taskStatus,
    isTaskAgentInstance: true,
    taskAgentRunId: `${teamRunId}-task-run`,
    taskId: 'task_0001',
    logicalMemberRouteKey: 'worker',
    taskDescription: 'Right-pane-only detail',
  };
  return {
    teamRunId,
    config: {
      teamDefinitionId: `${teamRunId}-definition`,
      teamDefinitionName: `Team ${teamRunId}`,
      workspaceId: null,
      workspaceMetadata: { workspaceRootPath },
    },
    coordinatorMemberRouteKey: 'worker',
    focusedMemberRouteKey: `${teamRunId}-task-run`,
    leafAgentContextsByRouteKey: new Map([
      ['worker', worker],
      [`${teamRunId}-task-run`, taskAgent],
    ]),
    memberNodesByRouteKey: new Map([
      ['worker', workerNode],
      [`${teamRunId}-task-run`, taskNode],
    ]),
    memberTree: [workerNode, taskNode],
    isActive: true,
    isSubscribed: true,
  } as any;
};

const buildProjection = (
  taskAStatus = AgentStatus.Running,
  previous?: ReturnType<typeof buildRunHistoryNavigationProjection>,
) => buildRunHistoryNavigationProjection({
  workspaceGroups: [],
  agentAvatarByDefinitionId: {},
  allWorkspaces: [
    { workspaceId: 'workspace-a', workspaceRootPath: '/workspace-a', name: 'Workspace A' },
    { workspaceId: 'workspace-b', workspaceRootPath: '/workspace-b', name: 'Workspace B' },
  ],
  workspacesById: {},
  agentContexts: new Map([
    ['standalone-a', buildAgentContext('standalone-a', '/workspace-a') as any],
    ['standalone-b', buildAgentContext('standalone-b', '/workspace-b') as any],
  ]),
  teamContexts: [
    buildTeamContext('team-a', '/workspace-a', taskAStatus),
    buildTeamContext('team-b', '/workspace-b'),
  ],
}, previous);

describe('runHistoryNavigationProjection', () => {
  it('publishes stable-plus-transient execution rows, exact focus, indexes, and reconciled equal branches', () => {
    const first = buildProjection();
    const team = first.teamNodes.find((candidate) => candidate.teamRunId === 'team-a')!;

    expect(team.focusedMemberRouteKey).toBe('team-a-task-run');
    expect(team.executionRows.map((row) => `${row.kind}:${row.memberRouteKey}`)).toEqual([
      'stable_member:worker',
      'transient_execution:team-a-task-run',
    ]);
    expect(first.memberIndexByIdentity[runHistoryMemberIndexKey('team-a', 'team-a-task-run')])
      .toBe(1);
    expect(first.runAncestryById['standalone-a']).toEqual({
      workspaceId: 'workspace-a',
      agentDefinitionId: 'standalone-a-definition',
    });
    expect(first.teamAncestryById['team-a']).toEqual({
      workspaceId: 'workspace-a',
      teamDefinitionGroupKey: 'team-a-definition',
    });
    expect(first.memberAncestorRouteKeysByIdentity[
      runHistoryMemberIndexKey('team-a', 'team-a-task-run')
    ]).toEqual(['worker']);

    const second = buildProjection(AgentStatus.Running, first);

    expect(second.workspaceNodes[0]).toBe(first.workspaceNodes[0]);
    expect(second.workspaceNodes[1]).toBe(first.workspaceNodes[1]);
    expect(second.teamNodes[0]).toBe(first.teamNodes[0]);
    expect(second.teamNodes[1]).toBe(first.teamNodes[1]);
    expect(second.workspaceNodes).toBe(first.workspaceNodes);
    expect(second.teamNodes).toBe(first.teamNodes);
    expect(second.teamNodesByWorkspaceRoot).toBe(first.teamNodesByWorkspaceRoot);
  });

  it('reuses an unrelated workspace team bucket when one team topology changes', () => {
    const first = buildProjection();
    const changed = buildProjection(AgentStatus.Idle, first);

    expect(changed.teamNodes).not.toBe(first.teamNodes);
    expect(changed.teamNodesByWorkspaceRoot).not.toBe(first.teamNodesByWorkspaceRoot);
    expect(changed.teamNodesByWorkspaceRoot['/workspace-a'])
      .not.toBe(first.teamNodesByWorkspaceRoot['/workspace-a']);
    expect(changed.teamNodesByWorkspaceRoot['/workspace-b'])
      .toBe(first.teamNodesByWorkspaceRoot['/workspace-b']);
    expect(changed.teamNodesByWorkspaceRoot['/workspace-b']?.[0])
      .toBe(first.teamNodesByWorkspaceRoot['/workspace-b']?.[0]);
  });

  it('patches only the indexed standalone branch and skips activity in the same minute bucket', () => {
    const state = buildProjection();
    const sameMinute: RunNavigationEffect = {
      kind: 'ACTIVITY',
      occurredAt: '2026-07-01T10:00:59.000Z',
    };
    const unchanged = applyRunNavigationEffectToProjection(state, {
      kind: 'standalone',
      runId: 'standalone-a',
      currentStatus: AgentStatus.Idle,
    }, sameMinute);
    expect(unchanged).toEqual({ state, changed: false });

    const changed = applyRunNavigationEffectToProjection(state, {
      kind: 'standalone',
      runId: 'standalone-a',
      currentStatus: AgentStatus.Idle,
    }, { kind: 'ACTIVITY', occurredAt: '2026-07-01T10:01:00.000Z' });

    expect(changed.changed).toBe(true);
    expect(changed.state.workspaceNodes[0]).not.toBe(state.workspaceNodes[0]);
    expect(changed.state.workspaceNodes[1]).toBe(state.workspaceNodes[1]);
    expect(changed.state.teamNodes).toBe(state.teamNodes);
  });

  it('applies tight task-row and focus patches while equal or detail-free changes do no work', () => {
    const state = buildProjection();
    const otherTeam = state.teamNodes.find((team) => team.teamRunId === 'team-b');
    const status = applyTaskExecutionRowPresentationToProjection(
      state,
      'team-a',
      'team-a-task-run',
      [{ field: 'CURRENT_STATUS', value: AgentStatus.Idle }],
    );

    expect(status.changed).toBe(true);
    expect(status.state.teamNodes.find((team) => team.teamRunId === 'team-b')).toBe(otherTeam);
    expect(status.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.executionRows[1])
      .toMatchObject({ currentStatus: AgentStatus.Idle });
    expect(applyTaskExecutionRowPresentationToProjection(
      status.state,
      'team-a',
      'team-a-task-run',
      [{ field: 'CURRENT_STATUS', value: AgentStatus.Idle }],
    ).changed).toBe(false);
    expect(applyTaskExecutionRowPresentationToProjection(
      status.state,
      'team-a',
      'team-a-task-run',
      [],
    ).changed).toBe(false);

    const focus = applyRunNavigationTeamFocusToProjection(status.state, 'team-a', 'worker');
    expect(focus.changed).toBe(true);
    expect(focus.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.focusedMemberRouteKey)
      .toBe('worker');
    expect(applyRunNavigationTeamFocusToProjection(focus.state, 'team-a', 'worker').changed)
      .toBe(false);
  });

  it('applies combined status, summary, and activity through one exact branch patch', () => {
    const state = buildProjection();
    const standalone = applyRunNavigationEffectToProjection(state, {
      kind: 'standalone',
      runId: 'standalone-a',
      currentStatus: AgentStatus.Running,
      summary: 'local standalone message',
    }, { kind: 'PRESENTATION', occurredAt: '2026-07-01T10:01:00.000Z' });
    const standaloneRow = standalone.state.workspaceNodes[0]?.agents[0]?.runs[0];

    expect(standalone.changed).toBe(true);
    expect(standaloneRow).toMatchObject({
      currentStatus: AgentStatus.Running,
      summary: 'local standalone message',
      lastActivityAt: '2026-07-01T10:01:00.000Z',
    });
    expect(standalone.state.workspaceNodes[1]).toBe(state.workspaceNodes[1]);

    const team = applyRunNavigationEffectToProjection(standalone.state, {
      kind: 'team_member',
      teamRunId: 'team-a',
      memberRouteKey: 'team-a-task-run',
      memberRunId: 'team-a-task-run',
      currentStatus: AgentStatus.Idle,
      summary: 'local team message',
    }, { kind: 'PRESENTATION', occurredAt: '2026-07-01T10:01:00.000Z' });
    const teamNode = team.state.teamNodes.find((candidate) => candidate.teamRunId === 'team-a');

    expect(team.changed).toBe(true);
    expect(teamNode).toMatchObject({
      summary: 'local team message',
      lastActivityAt: '2026-07-01T10:01:00.000Z',
    });
    expect(teamNode?.executionRows[1]).toMatchObject({ currentStatus: AgentStatus.Idle });
    expect(team.state.teamNodesByWorkspaceRoot['/workspace-b'])
      .toBe(standalone.state.teamNodesByWorkspaceRoot['/workspace-b']);
  });

  it('patches an actual root team lifecycle transition and no-ops an equal snapshot', () => {
    const state = buildProjection();
    const unchanged = applyRunNavigationEffectToProjection(state, {
      kind: 'team_run', teamRunId: 'team-a', isActive: true,
    }, { kind: 'PRESENTATION' });
    expect(unchanged).toEqual({ state, changed: false });

    const changed = applyRunNavigationEffectToProjection(state, {
      kind: 'team_run', teamRunId: 'team-a', isActive: false,
    }, { kind: 'PRESENTATION' });
    expect(changed.changed).toBe(true);
    expect(changed.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.isActive).toBe(false);
    expect(changed.state.teamNodes.find((team) => team.teamRunId === 'team-b'))
      .toBe(state.teamNodes.find((team) => team.teamRunId === 'team-b'));
  });
});
