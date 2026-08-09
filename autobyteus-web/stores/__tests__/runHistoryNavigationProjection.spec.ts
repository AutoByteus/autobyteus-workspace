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

const buildTeamContext = (teamRunId: string, workspaceRootPath: string) => {
  const worker = buildAgentContext(`${teamRunId}-worker-run`, workspaceRootPath);
  const taskAgent = buildAgentContext(`${teamRunId}-task-run`, workspaceRootPath, AgentStatus.Running);
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
    currentStatus: AgentStatus.Running,
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

const buildProjection = () => buildRunHistoryNavigationProjection({
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
    buildTeamContext('team-a', '/workspace-a'),
    buildTeamContext('team-b', '/workspace-b'),
  ],
});

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

    const second = buildRunHistoryNavigationProjection({
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
        buildTeamContext('team-a', '/workspace-a'),
        buildTeamContext('team-b', '/workspace-b'),
      ],
    }, first);

    expect(second.workspaceNodes[0]).toBe(first.workspaceNodes[0]);
    expect(second.workspaceNodes[1]).toBe(first.workspaceNodes[1]);
    expect(second.teamNodes[0]).toBe(first.teamNodes[0]);
    expect(second.teamNodes[1]).toBe(first.teamNodes[1]);
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
});
