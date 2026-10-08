import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { buildRunHistoryTreeNodes } from '~/stores/runHistoryReadModel';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

// Archive / Delete of the run that is open, through the real run history, context and selection
// stores. Only the server mutation is stubbed. The open run must leave no loaded context (so no
// `local` sidebar row) and no other loaded run may be selected in its place.

const io = vi.hoisted(() => ({ mutate: vi.fn(), query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ mutate: io.mutate, query: io.query }) }));

const WORKSPACE_ROOT = '/ws/a';

const agentContext = (runId: string) => new AgentContext({
  agentDefinitionId: 'agent-def-1', agentDefinitionName: 'SuperAgent', llmModelIdentifier: 'm', runtimeKind: 'autobyteus',
  workspaceId: null, workspaceMetadata: { workspaceRootPath: WORKSPACE_ROOT } as any, autoExecuteTools: false, isLocked: false,
}, new AgentRunState(runId, {
  id: runId, messages: [], createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z', agentDefinitionId: 'agent-def-1',
}));

const agentHistoryGroup = (runIds: string[]) => ({
  workspaceRootPath: WORKSPACE_ROOT,
  workspaceName: 'a',
  agentDefinitions: [{
    agentDefinitionId: 'agent-def-1',
    agentName: 'SuperAgent',
    runs: runIds.map((runId) => ({
      runId, summary: runId, createdAt: '2026-10-08T00:00:00.000Z', status: 'offline', isActive: false,
    })),
  }],
  teamDefinitions: [],
}) as any;

const sidebarAgentRunIds = () => buildRunHistoryTreeNodes({
  workspaceGroups: useRunHistoryStore().workspaceGroups,
  agentAvatarByDefinitionId: {},
  allWorkspaces: [{ workspaceId: 'ws-a', workspaceRootPath: WORKSPACE_ROOT, absolutePath: WORKSPACE_ROOT, name: 'a', kind: 'filesystem' }],
  workspacesById: { 'ws-a': { workspaceRootPath: WORKSPACE_ROOT, absolutePath: WORKSPACE_ROOT } },
  agentContexts: useAgentContextsStore().runs as any,
}).flatMap((workspace) => workspace.agents.flatMap((agent) => agent.runs.map((run) => run.runId)));

const openAgentRuns = () => {
  const contexts = useAgentContextsStore();
  contexts.runs.set('run-other', agentContext('run-other'));
  contexts.runs.set('run-open', agentContext('run-open'));
  const history = useRunHistoryStore();
  history.workspaceGroups = [agentHistoryGroup(['run-open', 'run-other'])];
  history.selectedRunId = 'run-open';
  useAgentSelectionStore().selectRun('run-open', 'agent');
  vi.spyOn(history, 'refreshTreeQuietly').mockResolvedValue(undefined);
  return history;
};

const openTeamRuns = () => {
  const teams = useAgentTeamContextsStore();
  teams.addTeamContext(buildTestTeamContext({ teamRunId: 'team-other', rootChildren: [testAgentNode('/coordinator')] }));
  teams.addTeamContext(buildTestTeamContext({ teamRunId: 'team-open', rootChildren: [testAgentNode('/coordinator')] }));
  const history = useRunHistoryStore();
  history.selectedTeamRunId = 'team-open';
  // Team and member views both select the root team run.
  useAgentSelectionStore().selectRun('team-open', 'team');
  vi.spyOn(history, 'refreshTreeQuietly').mockResolvedValue(undefined);
  return history;
};

describe('archive / delete of the open run', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it.each([
    ['archiveRun', 'archiveStoredRun'],
    ['deleteRun', 'deleteStoredRun'],
  ] as const)('%s of the open agent run leaves no context, no sidebar row and no other run selected', async (action, resultKey) => {
    const history = openAgentRuns();
    io.mutate.mockResolvedValueOnce({ data: { [resultKey]: { success: true, message: 'ok' } }, errors: [] });
    expect(sidebarAgentRunIds()).toEqual(expect.arrayContaining(['run-open', 'run-other']));

    await expect(history[action]('run-open')).resolves.toBe(true);

    expect(useAgentContextsStore().getRun('run-open')).toBeUndefined();
    expect(sidebarAgentRunIds()).not.toContain('run-open');
    expect(sidebarAgentRunIds()).toContain('run-other');
    expect(useAgentSelectionStore().selectedRunId).toBeNull();
    expect(useAgentSelectionStore().selectedType).toBeNull();
  });

  it('archiveAgentRunGroup ("Archive all") of the open agent run leaves no context and no other run selected', async () => {
    const history = openAgentRuns();
    io.mutate.mockResolvedValueOnce({
      data: { archiveStoredAgentRunGroup: { archivedRunIds: ['run-open', 'run-other'], activeRunIds: [], failedRunIds: [] } },
      errors: [],
    });

    await history.archiveAgentRunGroup(WORKSPACE_ROOT, 'agent-def-1');

    expect(useAgentContextsStore().getRun('run-open')).toBeUndefined();
    expect(sidebarAgentRunIds()).toEqual([]);
    expect(useAgentSelectionStore().selectedRunId).toBeNull();
  });

  it('archiving a different agent run keeps the open run selected', async () => {
    const history = openAgentRuns();
    io.mutate.mockResolvedValueOnce({ data: { archiveStoredRun: { success: true, message: 'ok' } }, errors: [] });

    await history.archiveRun('run-other');

    expect(useAgentContextsStore().getRun('run-open')).toBeDefined();
    expect(sidebarAgentRunIds()).toEqual(['run-open']);
    expect(useAgentSelectionStore().selectedRunId).toBe('run-open');
  });

  it.each([
    ['archiveTeamRun', 'archiveStoredTeamRun'],
    ['deleteTeamRun', 'deleteStoredTeamRun'],
  ] as const)('%s of the open team run leaves no team context and no other team selected', async (action, resultKey) => {
    const history = openTeamRuns();
    io.mutate.mockResolvedValueOnce({ data: { [resultKey]: { success: true, message: 'ok' } }, errors: [] });

    await expect(history[action]('team-open')).resolves.toBe(true);

    expect(useAgentTeamContextsStore().getTeamContextById('team-open')).toBeUndefined();
    expect(useAgentTeamContextsStore().getTeamContextById('team-other')).toBeDefined();
    expect(useAgentSelectionStore().selectedRunId).toBeNull();
    expect(useAgentSelectionStore().selectedType).toBeNull();
    expect(history.selectedTeamRunId).toBeNull();
  });

  it('archiveTeamRuns ("Archive all") of the open team run leaves no other team selected', async () => {
    const history = openTeamRuns();
    io.mutate.mockResolvedValueOnce({ data: { archiveStoredTeamRun: { success: true, message: 'ok' } }, errors: [] });

    await history.archiveTeamRuns(['team-open']);

    expect(useAgentTeamContextsStore().getTeamContextById('team-open')).toBeUndefined();
    expect(useAgentSelectionStore().selectedRunId).toBeNull();
  });
});
