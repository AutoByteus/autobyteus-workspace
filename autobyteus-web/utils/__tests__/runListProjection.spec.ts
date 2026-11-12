import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunListEntries, type RunListSources } from '~/utils/runListProjection';

const storedRun = (runId: string, createdAt: string, overrides: Record<string, unknown> = {}) =>
  ({ runId, summary: runId, createdAt, lastActivityAt: createdAt, status: AgentStatus.Offline, isActive: false, ...overrides });
const folder = (workspaceRootPath: string, agents: Array<{ id: string; name: string; runs: unknown[] }>, teams: unknown[] = []) => ({
  workspaceRootPath, workspaceName: workspaceRootPath.split('/').at(-1),
  agentDefinitions: agents.map((agent) => ({ agentDefinitionId: agent.id, agentName: agent.name, runs: agent.runs })),
  teamDefinitions: teams,
});
const localContext = (status: AgentStatus, updatedAt: string, rootPath = '/ws/a') => ({
  config: { agentDefinitionId: 'agent-one', agentDefinitionName: 'Agent One', workspaceMetadata: { workspaceRootPath: rootPath } },
  state: { currentStatus: status, conversation: { messages: [], createdAt: updatedAt, updatedAt } },
});
const team = (teamRunId: string, lastActivityAt: string, isActive = false) => ({
  teamRunId, teamDefinitionId: 'team-def', teamDefinitionName: 'Video Team', workspaceRootPath: '/ws/b', summary: 'Edit',
  lastActivityAt, isActive, deleteLifecycle: 'READY', focusedAgentRunId: '', rootTeam: {}, members: [], executionRows: [],
});
const org = (rootRunId: string, createdAt: string, lastActivityAt = createdAt) => ({
  stableKey: rootRunId, rootSubjectKind: 'agent_org', rootRunId, createdAt, lastActivityAt, archivedAt: null, isActive: true, summary: 'Launch',
  closedTaskExecutions: [],
  executionTree: { rootOrg: { orgDefinitionId: 'org-def', orgDefinitionName: 'Launch Org', members: [], defaultLaunchConfiguration: { workspaceRootPath: '/ws/c/' } } },
});
const build = (sources: Partial<RunListSources>) => buildRunListEntries({
  workspaceGroups: [], agentContexts: new Map(), agentAvatarByDefinitionId: {}, teamNodes: [], agentOrgHistory: [],
  ...sources,
} as RunListSources);

describe('buildRunListEntries (the Runs view, workspace-tree-vs-chooser DS-003, from autobyteus-378)', () => {
  it('lists Agent, Team and Org runs of every folder in one list, newest first by last activity', () => {
    const entries = build({
      workspaceGroups: [
        folder('/ws/a', [{ id: 'agent-one', name: 'Agent One', runs: [storedRun('a-old', '2026-09-01T00:00:00.000Z'), storedRun('a-new', '2026-09-05T00:00:00.000Z')] }]),
        // A folder the Workspaces view does not list (or one removed from the chooser) is listed too.
        folder('/ws/removed-from-list', [{ id: 'agent-two', name: 'Agent Two', runs: [storedRun('b', '2026-09-03T00:00:00.000Z')] }]),
      ] as never,
      teamNodes: [team('team-1', '2026-09-04T00:00:00.000Z', true)] as never,
      agentOrgHistory: [org('org-1', '2026-09-02T00:00:00.000Z')] as never,
    });
    expect(entries.map((entry) => entry.key)).toEqual(['agent:a-new', 'team:team-1', 'agent:b', 'org:org-1', 'agent:a-old']);
    expect(entries.map((entry) => entry.name)).toEqual(['Agent One', 'Video Team', 'Agent Two', 'Launch Org', 'Agent One']);
    expect(entries.map((entry) => entry.folderRootPath)).toEqual(['/ws/a', '/ws/b', '/ws/removed-from-list', '/ws/c', '/ws/a']);
    // A running run is not moved up: recency is the one rule.
    expect(entries[1]).toMatchObject({ kind: 'team', isActive: true });
  });

  it('overlays a stored run with its live context but keeps the server\'s clock for the order (DS-003)', () => {
    const entries = build({
      workspaceGroups: [folder('/ws/a', [{ id: 'agent-one', name: 'Agent One', runs: [
        storedRun('a-1', '2026-09-01T00:00:00.000Z'), storedRun('a-2', '2026-09-02T00:00:00.000Z'),
      ] }])] as never,
      agentContexts: new Map([['a-1', localContext(AgentStatus.Running, '2026-09-09T00:00:00.000Z')]]) as never,
    });
    expect(entries.map((entry) => entry.runId)).toEqual(['a-2', 'a-1']);
    expect(entries[1]).toMatchObject({ isActive: true, lastActivityAt: '2026-09-01T00:00:00.000Z', run: { currentStatus: AgentStatus.Running, source: 'history' } });
  });

  it('orders every kind by the server\'s last activity: delegated work moves an old run up', () => {
    const entries = build({
      workspaceGroups: [folder('/ws/a', [{ id: 'agent-one', name: 'Agent One', runs: [
        storedRun('a-old', '2026-09-01T00:00:00.000Z', { lastActivityAt: '2026-09-08T00:00:00.000Z' }),
        storedRun('a-new', '2026-09-05T00:00:00.000Z'),
      ] }], [{ teamDefinitionId: 'team-def', teamDefinitionName: 'Video Team', runs: [
        { teamRunId: 'team-1', createdAt: '2026-09-02T00:00:00.000Z', lastActivityAt: '2026-09-07T00:00:00.000Z' },
      ] }])] as never,
      // The tree's node carries its own time; the list takes the history item's.
      teamNodes: [team('team-1', '2026-09-02T00:00:00.000Z')] as never,
      agentOrgHistory: [org('org-1', '2026-09-03T00:00:00.000Z', '2026-09-06T00:00:00.000Z')] as never,
    });
    expect(entries.map((entry) => entry.key)).toEqual(['agent:a-old', 'team:team-1', 'org:org-1', 'agent:a-new']);
  });

  it('orders a run of this session no read lists yet by its creation', () => {
    const entries = build({
      workspaceGroups: [folder('/ws/a', [{ id: 'agent-one', name: 'Agent One', runs: [storedRun('a', '2026-09-05T00:00:00.000Z')] }])] as never,
      agentContexts: new Map([['run-local', { ...localContext(AgentStatus.Running, '2026-09-04T00:00:00.000Z'),
        state: { currentStatus: AgentStatus.Running, conversation: { messages: [], createdAt: '2026-09-04T00:00:00.000Z', updatedAt: '2026-09-09T00:00:00.000Z' } } }]]) as never,
    });
    expect(entries.map((entry) => [entry.runId, entry.lastActivityAt])).toEqual([['a', '2026-09-05T00:00:00.000Z'], ['run-local', '2026-09-04T00:00:00.000Z']]);
  });

  it('preserves authoritative inactivity for a stored run with past error evidence', () => {
    const [entry] = build({
      workspaceGroups: [folder('/ws/a', [{ id: 'agent-one', name: 'Agent One', runs: [
        storedRun('run-past-error', '2026-09-03T11:00:00.000Z', { status: AgentStatus.Error }),
      ] }])] as never,
    });
    expect(entry).toMatchObject({ kind: 'agent', isActive: false, run: { currentStatus: AgentStatus.Error, lastKnownStatus: 'ERROR', source: 'history' } });
  });

  it.each([
    [AgentStatus.Initializing, true, 'ACTIVE'],
    [AgentStatus.Running, true, 'ACTIVE'],
    [AgentStatus.Idle, true, 'ACTIVE'],
    [AgentStatus.Error, true, 'ERROR'],
    [AgentStatus.Offline, false, 'IDLE'],
  ] as const)('lists a %s run of this session no read lists yet (isActive=%s, %s)', (status, isActive, lastKnownStatus) => {
    const [entry] = build({ agentContexts: new Map([['run-local', localContext(status, '2026-09-03T12:00:00.000Z')]]) as never });
    expect(entry).toMatchObject({ kind: 'agent', runId: 'run-local', name: 'Agent One', isActive, run: { currentStatus: status, lastKnownStatus, source: 'local' } });
  });

  it('leaves New chat drafts to the Chat row', () => {
    expect(build({ agentContexts: new Map([['temp-draft', localContext(AgentStatus.Offline, '2026-09-03T12:00:00.000Z')]]) as never })).toEqual([]);
  });

  it('takes an agent avatar from the definition index when the history row has none', () => {
    const [entry] = build({
      workspaceGroups: [folder('/ws/a', [{ id: 'agent-one', name: 'Agent One', runs: [storedRun('a', '2026-09-01T00:00:00.000Z')] }])] as never,
      agentAvatarByDefinitionId: { 'agent-one': 'https://avatar/one.png' },
    });
    expect(entry).toMatchObject({ avatarUrl: 'https://avatar/one.png' });
  });
});
