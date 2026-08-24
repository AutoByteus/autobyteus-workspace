import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunNavigationEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
import {
  buildTestTeamContext,
  testAgentNode,
  testTaskRecord,
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
const stableAgentRunId = (teamRunId: string) => `${teamRunId}-worker-run`;
const taskAgentRunId = (teamRunId: string) => `${teamRunId}-task-run`;
const taskRowKey = (teamRunId: string) => `agent:${taskAgentRunId(teamRunId)}`;

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
    focusedAgentRunId: stableAgentRunId(teamRunId),
    rootChildren: [worker],
    workspaceRootPath,
    tasks: [testTaskRecord({
      taskId: 'task_0001',
      delegatorAgentRunId: stableAgentRunId(teamRunId),
      recipientAddress: '/worker',
      target: { agentRunId: taskAgentRunId(teamRunId) },
      description: 'Right-pane-only detail',
    })],
  });
  team.view.getAgentContext(taskAgentRunId(teamRunId))!.state.currentStatus = taskStatus;
  expect(team.view.focusAgent(taskAgentRunId(teamRunId)).disposition).toBe('applied');
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

const buildHistoricalProjection = () => {
  const teamRunId = 'historical-team';
  const worker = testAgentNode('/worker', {
    displayName: 'Worker',
    agentRunId: stableAgentRunId(teamRunId),
  });
  const taskRecord = testTaskRecord({
    taskId: 'settled-task',
    delegatorAgentRunId: worker.agentRunId,
    recipientAddress: worker.address,
    target: { agentRunId: taskAgentRunId(teamRunId) },
    status: 'interrupted',
  });
  const context = buildTestTeamContext({
    teamRunId,
    teamDefinitionId: `${teamRunId}-definition`,
    teamDefinitionName: 'Historical Team',
    coordinatorAddress: worker.address,
    focusedAgentRunId: taskAgentRunId(teamRunId),
    rootChildren: [worker],
    workspaceRootPath: '/historical-workspace',
    isActive: false,
    tasks: [taskRecord],
    taskExecutions: [{
      kind: 'task_agent', address: worker.address, agent_run_id: taskAgentRunId(teamRunId),
      platform_agent_run_id: null, started_at: timestamp, settled_at: '2026-07-01T10:05:00.000Z',
    }],
  });
  return buildRunHistoryNavigationProjection({
    workspaceGroups: [],
    agentAvatarByDefinitionId: {},
    allWorkspaces: [{
      workspaceId: 'historical-workspace',
      workspaceRootPath: '/historical-workspace',
      name: 'Historical Workspace',
    }],
    workspacesById: {},
    agentContexts: new Map(),
    teamContexts: [context],
  });
};

describe('runHistoryNavigationProjection current exact execution identity', () => {
  it('publishes stable and transient rows, exact focus/indexes, and reconciles equal branches', () => {
    const first = buildProjection();
    const team = first.teamNodes.find((candidate) => candidate.teamRunId === 'team-a')!;

    expect(team.focusedAgentRunId).toBe(taskAgentRunId('team-a'));
    expect(team.executionRows.map((row) => `${row.kind}:${row.rowKey}`)).toEqual([
      `stable_member:agent:${stableAgentRunId('team-a')}`,
      `transient_execution:${taskRowKey('team-a')}`,
    ]);
    expect(first.memberIndexByIdentity[runHistoryMemberIndexKey('team-a', taskAgentRunId('team-a'))]).toBe(1);
    expect(first.runAncestryById['standalone-a']).toEqual({
      workspaceId: 'workspace-a',
      agentDefinitionId: 'standalone-a-definition',
    });
    expect(first.teamAncestryById['team-a']).toEqual({
      workspaceId: 'workspace-a',
      teamDefinitionGroupKey: 'team-a-definition',
    });
    expect(first.memberAncestorExecutionKeysByIdentity[
      runHistoryMemberIndexKey('team-a', taskAgentRunId('team-a'))
    ]).toEqual([`agent:${stableAgentRunId('team-a')}`]);

    const second = buildProjection(AgentStatus.Running, first);
    expect(second.workspaceNodes).toBe(first.workspaceNodes);
    expect(second.teamNodes).toBe(first.teamNodes);
    expect(second.teamNodesByWorkspaceRoot).toBe(first.teamNodesByWorkspaceRoot);
  });

  it('indexes settled historical task rows with their exact execution ancestry and focus', () => {
    const projection = buildHistoricalProjection();
    const team = projection.teamNodes.find((candidate) => candidate.teamRunId === 'historical-team')!;
    const identity = runHistoryMemberIndexKey('historical-team', taskAgentRunId('historical-team'));

    expect(team).toMatchObject({ isActive: false, focusedAgentRunId: taskAgentRunId('historical-team') });
    expect(team.executionRows.find((row) => row.agentRunId === taskAgentRunId('historical-team')))
      .toMatchObject({
        kind: 'transient_execution',
        transientKind: 'task_agent',
        rowKey: taskRowKey('historical-team'),
      });
    expect(projection.memberIndexByIdentity[identity]).toBe(1);
    expect(projection.memberAncestorExecutionKeysByIdentity[identity])
      .toEqual([`agent:${stableAgentRunId('historical-team')}`]);
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
      taskRowKey('team-a'),
      [{ field: 'CURRENT_STATUS', value: AgentStatus.Idle }],
    );

    expect(status.changed).toBe(true);
    expect(status.state.teamNodes.find((team) => team.teamRunId === 'team-b')).toBe(otherTeam);
    expect(status.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.executionRows
      .find((row) => row.rowKey === taskRowKey('team-a')))
      .toMatchObject({ currentStatus: AgentStatus.Idle });
    expect(applyTaskExecutionRowPresentationToProjection(
      status.state, 'team-a', taskRowKey('team-a'), [{ field: 'CURRENT_STATUS', value: AgentStatus.Idle }],
    ).changed).toBe(false);
    expect(applyTaskExecutionRowPresentationToProjection(status.state, 'team-a', taskRowKey('team-a'), []).changed)
      .toBe(false);

    const focus = applyRunNavigationTeamFocusToProjection(status.state, 'team-a', stableAgentRunId('team-a'));
    expect(focus.changed).toBe(true);
    expect(focus.state.teamNodes.find((team) => team.teamRunId === 'team-a')?.focusedAgentRunId)
      .toBe(stableAgentRunId('team-a'));
    expect(applyRunNavigationTeamFocusToProjection(focus.state, 'team-a', stableAgentRunId('team-a')).changed).toBe(false);
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
      agentRunId: taskAgentRunId('team-a'),
      currentStatus: AgentStatus.Idle,
      summary: 'local team message',
    }, { kind: 'PRESENTATION', occurredAt: '2026-07-01T10:01:00.000Z' });
    const teamNode = team.state.teamNodes.find((candidate) => candidate.teamRunId === 'team-a');
    expect(teamNode).toMatchObject({ summary: 'local team message', lastActivityAt: '2026-07-01T10:01:00.000Z' });
    expect(teamNode?.executionRows.find((row) => row.rowKey === taskRowKey('team-a')))
      .toMatchObject({ currentStatus: AgentStatus.Idle });
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
