import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import { TeamStreamingService } from '~/services/agentStreaming/TeamStreamingService';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { reconcileDiscoveredActiveRuns, type RunHistoryFetchStoreLike } from '~/stores/runHistoryLoadActions';
import { inspectMountedTeamMember } from '~/services/runOpen/teamMemberInspectionCoordinator';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRetainedTeamHistoryFixture, HISTORY_TEAM_ROOT as ROOT } from '~/test-support/retainedTeamHistoryFixture';

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRoute: () => ({ query: {} }) }));
let dispose: (() => void) | undefined;
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks();
  io.query.mockImplementation(async ({ variables }) => ({ data: { getTeamMemberRunProjection: {
    agentRunId: variables.agentRunId, conversation: [{ kind: 'assistant', role: 'assistant', content: `Result ${variables.agentRunId}`, ts: 10 }],
    activities: [{ kind: 'system_instruction', activityId: `activity-${variables.agentRunId}`, content: 'Exact retained Activity', ts: 11 }],
  } } }));
});
afterEach(() => { dispose?.(); dispose = undefined; vi.restoreAllMocks(); });

const harness = (recursive = false) => {
  const fixture = buildRetainedTeamHistoryFixture(recursive);
  const contexts = useAgentTeamContextsStore(); contexts.teams = new Map([[ROOT, fixture.team]]);
  const team = contexts.getTeamContextById(ROOT)!;
  const history = useRunHistoryStore();
  vi.spyOn(history, 'refreshRunNavigationTopology').mockResolvedValue(undefined);
  vi.spyOn(history, 'reconcileFocusedTeamMemberProjection').mockResolvedValue(undefined);
  const callbacks = new Map<string, (wire: string) => void>();
  const ws = { state: 'connected', connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
    on: vi.fn((event, cb) => callbacks.set(event, cb)), off: vi.fn() };
  const recovery = vi.fn();
  const stream = new TeamStreamingService('ws://fixture.invalid', { wsClient: ws as any, onStreamRecoveryRequired: recovery });
  stream.connect(ROOT, team); dispose = () => stream.disconnect();
  const runStore = useAgentTeamRunStore();
  vi.spyOn(runStore, 'isTeamStreamReady').mockImplementation(() => stream.isReady);
  vi.spyOn(runStore, 'isTeamStreamReopenRequired').mockImplementation(() => stream.isReopenRequired);
  const connect = vi.spyOn(runStore, 'connectToTeamStream').mockImplementation(() => undefined);
  const emit = (frame: unknown) => { const wire = JSON.stringify(frame); parseTeamStreamServerMessage(wire); callbacks.get('onMessage')!(wire); };
  const ready = () => { emit({ type: 'CONNECTED', payload: { session_id: 'fixture', root_team_run_id: ROOT } }); emit(fixture.snapshot); };
  const reconcile = () => reconcileDiscoveredActiveRuns({ workspaceGroups: [{ workspaceRootPath: '/fixture', workspaceName: 'fixture', agentDefinitions: [],
    teamDefinitions: [{ teamDefinitionId: 'test-team-definition', teamDefinitionName: 'History Team', runs: [{ teamRunId: ROOT, isActive: true }] }] }],
  } as RunHistoryFetchStoreLike);
  useAgentSelectionStore().selectRun(ROOT, 'team');
  return { ...fixture, team, stream, ready, reconcile, connect, ws, emit, recovery };
};

describe('history and strict Team stream status reconciliation', () => {
  it.each([[false, false], [true, false], [false, true], [true, true]])(
    'preserves retired execution status with ready=%s, recursive=%s', async (alreadyReady, recursive) => {
      const h = harness(recursive); const view = h.team.view;
      const contexts = view.listAgentContextEntries();
      const liveIds = ['lead', 'configured-verifier', 'live-task', ...(recursive ? ['group-worker', 'nested-worker', 'live-worker'] : [])].sort();
      expect(view.listLiveAgentContextEntries().map(entry => entry.agentRunId).sort()).toEqual(liveIds);
      view.focusAgentForInspection('repeat');
      const repeat = view.getAgentContext('repeat')!; repeat.requirement = 'Retained draft';
      if (alreadyReady) h.ready();
      await h.reconcile();
      for (const id of h.retiredIds) expect(view.getAgentContext(id)!.state.currentStatus).toBe(AgentStatus.Offline);
      for (const status of h.snapshot.payload.agent_statuses) expect(view.getAgentContext(status.agent_run_id)!.state.currentStatus)
        .toBe(alreadyReady ? status.status : AgentStatus.Initializing);
      expect(h.connect).toHaveBeenCalledTimes(alreadyReady ? 0 : 1);
      if (!alreadyReady) h.ready();
      expect(h.stream.isReady).toBe(true); expect(view.getChangeSequence()).toBe(648);
      expect(view.needsStreamRecovery()).toBe(false); expect(h.recovery).not.toHaveBeenCalled();
      expect(view.getFocusedAgentRunId()).toBe('repeat'); expect(repeat.requirement).toBe('Retained draft');
      for (const entry of contexts) expect(view.getAgentContext(entry.agentRunId)).toBe(entry.agentContext);
      const active = useActiveContextStore();
      for (const id of h.retiredIds) {
        const inspected = await inspectMountedTeamMember({ teamRunId: ROOT, agentRunId: id, commit: vi.fn() });
        expect(inspected.disposition).toBe('committed');
        expect(active.activeWorkspaceTarget?.context.state.runId).toBe(id);
        expect(active.activeWorkspaceTarget?.access).toBe('read_only'); expect(active.activeWorkspaceTarget).not.toHaveProperty('interaction');
        expect(view.getAgentContext(id)!.state.currentStatus).toBe(AgentStatus.Offline);
        expect(view.getAgentContext(id)!.state.conversation.messages).toHaveLength(1);
        expect(useAgentActivityStore().getActivities(id)).toEqual([expect.objectContaining({ activityId: `activity-${id}` })]);
      }
      for (const status of h.snapshot.payload.agent_statuses) expect(view.getAgentContext(status.agent_run_id)!.state.currentStatus).toBe(status.status);
      h.emit({ type: 'AGENT_STATUS', payload: { change_sequence: 649, agent_run_id: 'lead', status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null } });
      expect(view.getChangeSequence()).toBe(649); expect(view.getAgentContext('lead')!.state.currentStatus).toBe(AgentStatus.Running);
      expect(view.isRootTeamActive()).toBe(true); expect(view.getExecutionTree()).toEqual(h.snapshot.payload.execution_tree);
      expect(view.listTaskHistoryRows().map(row => row.task)).toEqual(h.snapshot.payload.tasks);
      expect(io.mutate).not.toHaveBeenCalled(); expect(h.ws.send).not.toHaveBeenCalled();
    },
  );

  it('preserves a retained terminal error and does not admit an incomplete live snapshot', async () => {
    const h = harness(); h.team.view.getAgentContext('first')!.state.currentStatus = AgentStatus.Error;
    await h.reconcile(); expect(h.team.view.getAgentContext('first')!.state.currentStatus).toBe(AgentStatus.Error);
    h.emit({ type: 'CONNECTED', payload: { session_id: 'fixture', root_team_run_id: ROOT } });
    h.emit({ ...h.snapshot, payload: { ...h.snapshot.payload, agent_statuses: h.snapshot.payload.agent_statuses.filter(s => s.agent_run_id !== 'live-task') } });
    expect(h.stream.isReady).toBe(false); expect(h.stream.synchronizationPhase).toBe('awaiting_snapshot');
    expect(h.team.view.getChangeSequence()).toBe(0);
    expect(h.team.view.getAgentContext('first')!.state.currentStatus).toBe(AgentStatus.Error);
    h.emit(h.snapshot);
    h.emit({ type: 'AGENT_STATUS', payload: { change_sequence: 650, agent_run_id: 'lead', status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null } });
    expect(h.stream.isReopenRequired).toBe(true);
    expect(h.team.view.getChangeSequence()).toBe(648);
    const before = h.team.view.listAgentContextEntries().map(e => e.agentContext.state.currentStatus);
    h.connect.mockClear(); await h.reconcile();
    expect(h.team.view.listAgentContextEntries().map(e => e.agentContext.state.currentStatus)).toEqual(before);
    expect(h.connect).not.toHaveBeenCalled(); expect(h.ws.send).not.toHaveBeenCalled(); expect(io.mutate).not.toHaveBeenCalled();
  });
});


it('RET-07: authoritative inactive history reconciles the retained Team worker without refocus or runtime startup', async () => {
  const h = harness(); h.ready();
  h.team.view.focusAgentForInspection('configured-verifier');
  const retained = h.team.view.getAgentContext('configured-verifier')!;
  retained.requirement = 'retained worker draft';
  retained.contextFilePaths = [{ locator: '/retained.txt' } as any];
  const terminal = h.team.view.getAgentContext('first')!;
  terminal.state.currentStatus = AgentStatus.Error;
  const disconnect = vi.spyOn(useAgentTeamRunStore(), 'disconnectTeamStream').mockImplementation(() => h.stream.disconnect());
  await reconcileDiscoveredActiveRuns({ workspaceGroups: [] } as any);
  expect(h.team.view.isRootTeamActive()).toBe(false);
  expect(h.team.view.getFocusedAgentRunId()).toBe('configured-verifier');
  expect(h.team.view.getAgentContext('configured-verifier')).toBe(retained);
  expect(retained.state.currentStatus).toBe(AgentStatus.Offline);
  expect(terminal.state.currentStatus).toBe(AgentStatus.Error);
  expect(retained.requirement).toBe('retained worker draft');
  expect(retained.contextFilePaths).toEqual([{ locator: '/retained.txt' }]);
  expect(disconnect).toHaveBeenCalledWith(ROOT);
  expect(h.connect).not.toHaveBeenCalled();
  expect(io.mutate).not.toHaveBeenCalled(); expect(h.ws.send).not.toHaveBeenCalled();
});
