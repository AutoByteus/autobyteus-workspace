import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildAgentOrgHistoryRow } from '~/test-support/historyFamilyPublicationFixture';
import { parseAgentOrgHistoryItem } from '../runHistoryStoreSupport';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunNavigationEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
import {
  buildTestTeamContext,
  testAgentNode,
  testDelegation,
} from '~/test-support/currentTeamTestFixtures';
import {
  applyRunNavigationEffectToProjection,
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
    delegations: [testDelegation({ delegatorAgentRunId: stableAgentRunId(teamRunId), recipientAddress: '/worker', target: { agentRunId: taskAgentRunId(teamRunId) } })],
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
  agentOrgHistory: [],
}, previous);


describe('runHistoryNavigationProjection current exact execution identity', () => {
  it('publishes the Team\'s own rows, exact focus/indexes, and reconciles equal branches', () => {
    const first = buildProjection();
    const team = first.teamNodes.find((candidate) => candidate.teamRunId === 'team-a')!;

    expect(team.focusedAgentRunId).toBe(taskAgentRunId('team-a'));
    // SR-084: the Team's own members only; the runs it delegated are its tree's rows (runTreeStore).
    expect(team.executionRows.map((row) => `${row.kind}:${row.rowKey}`)).toEqual([`stable_member:agent:${stableAgentRunId('team-a')}`]);
    expect(first.runAncestryById['standalone-a']).toEqual({
      workspaceId: 'workspace:/workspace-a',
      agentDefinitionId: 'standalone-a-definition',
    });
    expect(first.teamAncestryById['team-a']).toEqual({
      workspaceId: 'workspace:/workspace-a',
      teamDefinitionGroupKey: 'team-a-definition',
    });

    const second = buildProjection(AgentStatus.Running, first);
    expect(second.workspaceNodes).toBe(first.workspaceNodes);
    expect(second.teamNodes).toBe(first.teamNodes);
    expect(second.teamNodesByWorkspaceRoot).toBe(first.teamNodesByWorkspaceRoot);
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

// Every typed presentation field must invalidate a changed Team branch, while
// unrelated Team/bucket references remain stable. Domain trees are not compared.
describe('typed navigation presentation equality', () => {
  const changed = (value: unknown): unknown => typeof value === 'boolean' ? !value
    : typeof value === 'number' ? value + 1 : `${value ?? ''}-changed`
  it.each([
    ...['teamDefinitionId', 'teamDefinitionName', 'workspaceRootPath', 'summary', 'lastActivityAt',
      'isActive', 'deleteLifecycle', 'focusedAgentRunId'].map(field => ['team', field]),
    ...['teamRunId', 'kind', 'memberAddress', 'displayName', 'agentRunId', 'teamDefinitionId',
      'teamRunIdForNode', 'coordinatorAddress', 'workspaceRootPath', 'summary', 'lastActivityAt',
      'currentStatus', 'isActive', 'deleteLifecycle'].map(field => ['root', field]),
    ...['memberAddress', 'displayName', 'summary', 'currentStatus', 'isActive', 'deleteLifecycle']
      .map(field => ['member', field]),
    ...['teamRunId', 'memberAddress', 'agentRunId', 'teamRunIdForNode', 'rowKey', 'memberKind',
      'displayName', 'depth', 'hasChildren'].map(field => ['execution', field]),
  ])('does not retain a previous %s with changed %s', (area, field) => {
    const first = buildProjection()
    const old = first.teamNodes.find(team => team.teamRunId === 'team-a')!
    const other = first.teamNodes.find(team => team.teamRunId === 'team-b')!
    const target = area === 'team' ? old : area === 'root' ? old.rootTeam
      : area === 'member' ? old.members[0]!
      : old.executionRows.find(row => row.kind === 'stable_member')!
    expect(target).toBeDefined()
    ;(target as any)[field!] = changed((target as any)[field!])
    const next = buildProjection(AgentStatus.Running, first)
    expect(next.teamNodes.find(team => team.teamRunId === 'team-a')).not.toBe(old)
    expect(next.teamNodes.find(team => team.teamRunId === 'team-b')).toBe(other)
    expect(next.teamNodesByWorkspaceRoot['/workspace-b']).toBe(first.teamNodesByWorkspaceRoot['/workspace-b'])
  })
})

 it('retains unchanged authoritative Org rows by reference without serializing execution trees', () => {
  const row = parseAgentOrgHistoryItem(buildAgentOrgHistoryRow({rootRunId:'org-row', workspaceRootPath:'/workspace-a'}));
  const input = { workspaceGroups: [], agentAvatarByDefinitionId: {},
    allWorkspaces: [{ workspaceId: 'ws-a', workspaceRootPath: '/workspace-a', name: 'workspace-a', kind: 'filesystem', isTemp: false }],
    workspacesById: {}, agentContexts: new Map(), teamContexts: [], agentOrgHistory: [row] };
  const first = buildRunHistoryNavigationProjection(input);
  const serialization = vi.spyOn(JSON, 'stringify').mockImplementation(() => { throw new Error('Navigation serialized a domain tree'); });
  try {
    const same = buildRunHistoryNavigationProjection(input, first);
    expect(same.workspaceNodes).toBe(first.workspaceNodes);
    const replaced = buildRunHistoryNavigationProjection({...input,agentOrgHistory:[{...row,summary:'Updated'}]}, first);
    expect(replaced.workspaceNodes).not.toBe(first.workspaceNodes);
    expect(replaced.workspaceNodes[0]?.agentOrgDefinitions[0]?.runs[0]?.summary).toBe('Updated');
  } finally { serialization.mockRestore(); }
});
