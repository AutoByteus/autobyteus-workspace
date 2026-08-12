import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunNavigationEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
import { createTeamExecutionAddress, serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  buildTestTeamContext,
  testAgentNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures';
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
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(timestamp));
});
afterAll(() => vi.useRealTimers());
const stableAddress = (teamRunId: string) => createTeamExecutionAddress({
  rootTeamRunId: teamRunId,
  memberAddress: '/worker',
});
const taskAddress = (teamRunId: string) => createTeamExecutionAddress({
  rootTeamRunId: teamRunId,
  memberAddress: '/worker',
  taskAgentRunId: `${teamRunId}-task-run`,
});

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
    conversation: { id: runId, messages: [], createdAt: timestamp, updatedAt: timestamp },
  },
});

const buildTeamContext = (
  teamRunId: string,
  workspaceRootPath: string,
  taskStatus = AgentStatus.Running,
) => {
  const worker = testAgentNode('/worker', {
    displayName: 'Worker',
    agentRunId: `${teamRunId}-worker-run`,
  });
  const team = buildTestTeamContext({
    teamRunId,
    teamDefinitionId: `${teamRunId}-definition`,
    teamDefinitionName: `Team ${teamRunId}`,
    coordinatorAddress: worker.address,
    focusedExecutionAddress: stableAddress(teamRunId),
    rootChildren: [worker],
    workspaceRootPath,
    tasks: [testTaskProjection({
      taskId: 'task_0001',
      executionAddress: taskAddress(teamRunId),
      senderAddress: stableAddress(teamRunId),
      content: 'Right-pane-only detail',
    })],
  });
  team.executions.getAgentContext(taskAddress(teamRunId))!.state.currentStatus = taskStatus;
  expect(team.executions.focus(taskAddress(teamRunId)).disposition).toBe('applied');
  return team;
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

describe('runHistoryNavigationProjection current exact execution identity', () => {
  it('publishes stable and transient rows, exact focus/indexes, and reconciles equal branches', () => {
    const first = buildProjection();
    const team = first.teamNodes.find((candidate) => candidate.teamRunId === 'team-a')!;

    expect(team.focusedExecutionAddress).toEqual(taskAddress('team-a'));
    expect(team.executionRows.map((row) => `${row.kind}:${serializeTeamExecutionAddress(row.executionAddress)}`)).toEqual([
      `stable_member:${serializeTeamExecutionAddress(stableAddress('team-a'))}`,
      `transient_execution:${serializeTeamExecutionAddress(taskAddress('team-a'))}`,
    ]);
    expect(first.memberIndexByIdentity[runHistoryMemberIndexKey('team-a', taskAddress('team-a'))]).toBe(1);
    expect(first.runAncestryById['standalone-a']).toEqual({
      workspaceId: 'workspace-a',
      agentDefinitionId: 'standalone-a-definition',
    });
    expect(first.teamAncestryById['team-a']).toEqual({
      workspaceId: 'workspace-a',
      teamDefinitionGroupKey: 'team-a-definition',
    });
    expect(first.memberAncestorExecutionKeysByIdentity[
      runHistoryMemberIndexKey('team-a', taskAddress('team-a'))
    ]).toEqual([]);

    const second = buildProjection(AgentStatus.Running, first);
    expect(second.workspaceNodes).toBe(first.workspaceNodes);
    expect(second.teamNodes).toBe(first.teamNodes);
    expect(second.teamNodesByWorkspaceRoot).toBe(first.teamNodesByWorkspaceRoot);
  });

  it('reuses an unrelated workspace Team bucket when one Team topology changes', () => {
    const first = buildProjection();
    const changed = buildProjection(AgentStatus.Idle, first);

    expect(changed.teamNodes).not.toBe(first.teamNodes);
    expect(changed.teamNodesByWorkspaceRoot).not.toBe(first.teamNodesByWorkspaceRoot);
    expect(changed.teamNodesByWorkspaceRoot['/workspace-a']).not.toBe(first.teamNodesByWorkspaceRoot['/workspace-a']);
    expect(changed.teamNodesByWorkspaceRoot['/workspace-b']).toBe(first.teamNodesByWorkspaceRoot['/workspace-b']);
  });

  it('patches only the indexed standalone branch and skips activity in the same minute bucket', () => {
    const state = buildProjection();
    const sameMinute: RunNavigationEffect = { kind: 'ACTIVITY', occurredAt: '2026-07-01T10:00:59.000Z' };
    expect(applyRunNavigationEffectToProjection(state, {
      kind: 'standalone', runId: 'standalone-a', currentStatus: AgentStatus.Idle,
    }, sameMinute)).toEqual({ state, changed: false });

    const changed = applyRunNavigationEffectToProjection(state, {
      kind: 'standalone', runId: 'standalone-a', currentStatus: AgentStatus.Idle,
    }, { kind: 'ACTIVITY', occurredAt: '2026-07-01T10:01:00.000Z' });
    expect(changed.changed).toBe(true);
    expect(changed.state.workspaceNodes[0]).not.toBe(state.workspaceNodes[0]);
    expect(changed.state.workspaceNodes[1]).toBe(state.workspaceNodes[1]);
    expect(changed.state.teamNodes).toBe(state.teamNodes);
  });

  it('applies tight task-row and exact-focus patches while equal/detail-free changes do no work', () => {
    const state = buildProjection();
    const otherTeam = state.teamNodes.find((team) => team.teamRunId === 'team-b');
    const status = applyTaskExecutionRowPresentationToProjection(
      state,
      'team-a',
      taskAddress('team-a'),
      [{ field: 'CURRENT_STATUS', value: AgentStatus.Idle }],
    );

    expect(status.changed).toBe(true);
    expect(status.state.teamNodes.find((team) => team.teamRunId === 'team-b')).toBe(otherTeam);
    expect(status.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.executionRows[1])
      .toMatchObject({ currentStatus: AgentStatus.Idle });
    expect(applyTaskExecutionRowPresentationToProjection(
      status.state, 'team-a', taskAddress('team-a'), [{ field: 'CURRENT_STATUS', value: AgentStatus.Idle }],
    ).changed).toBe(false);
    expect(applyTaskExecutionRowPresentationToProjection(status.state, 'team-a', taskAddress('team-a'), []).changed)
      .toBe(false);

    const focus = applyRunNavigationTeamFocusToProjection(status.state, 'team-a', stableAddress('team-a'));
    expect(focus.changed).toBe(true);
    expect(focus.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.focusedExecutionAddress)
      .toEqual(stableAddress('team-a'));
    expect(applyRunNavigationTeamFocusToProjection(focus.state, 'team-a', stableAddress('team-a')).changed).toBe(false);
  });

  it('applies combined status, summary, and activity through one exact Team branch patch', () => {
    const state = buildProjection();
    const standalone = applyRunNavigationEffectToProjection(state, {
      kind: 'standalone',
      runId: 'standalone-a',
      currentStatus: AgentStatus.Running,
      summary: 'local standalone message',
    }, { kind: 'PRESENTATION', occurredAt: '2026-07-01T10:01:00.000Z' });
    expect(standalone.state.workspaceNodes[0]?.agents[0]?.runs[0]).toMatchObject({
      currentStatus: AgentStatus.Running,
      summary: 'local standalone message',
      lastActivityAt: '2026-07-01T10:01:00.000Z',
    });

    const team = applyRunNavigationEffectToProjection(standalone.state, {
      kind: 'team_member',
      teamRunId: 'team-a',
      executionAddress: taskAddress('team-a'),
      currentStatus: AgentStatus.Idle,
      summary: 'local team message',
    }, { kind: 'PRESENTATION', occurredAt: '2026-07-01T10:01:00.000Z' });
    const teamNode = team.state.teamNodes.find((candidate) => candidate.teamRunId === 'team-a');
    expect(teamNode).toMatchObject({ summary: 'local team message', lastActivityAt: '2026-07-01T10:01:00.000Z' });
    expect(teamNode?.executionRows[1]).toMatchObject({ currentStatus: AgentStatus.Idle });
    expect(team.state.teamNodesByWorkspaceRoot['/workspace-b'])
      .toBe(standalone.state.teamNodesByWorkspaceRoot['/workspace-b']);
  });

  it('patches the root Team lifecycle and no-ops an equal snapshot', () => {
    const state = buildProjection();
    expect(applyRunNavigationEffectToProjection(state, {
      kind: 'team_run', teamRunId: 'team-a', isActive: true,
    }, { kind: 'PRESENTATION' })).toEqual({ state, changed: false });
    const changed = applyRunNavigationEffectToProjection(state, {
      kind: 'team_run', teamRunId: 'team-a', isActive: false,
    }, { kind: 'PRESENTATION' });
    expect(changed.changed).toBe(true);
    expect(changed.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.isActive).toBe(false);
    expect(changed.state.teamNodes.find((team) => team.teamRunId === 'team-b'))
      .toBe(state.teamNodes.find((team) => team.teamRunId === 'team-b'));
  });
});
