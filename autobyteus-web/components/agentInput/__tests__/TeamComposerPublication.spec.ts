import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, watchEffect } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { parseTeamStreamServerMessage, teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts';
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { TeamStreamingService } from '~/services/agentStreaming/TeamStreamingService';
import { collectAgentExecutionLocations } from '~/services/teamExecution/teamExecutionTreeSelectors';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';
import { AgentStatus } from '~/types/agent/AgentStatus';

const mocks = vi.hoisted(() => ({ topology: vi.fn(), projection: vi.fn(async () => undefined) }));
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  refreshRunNavigationTopology: mocks.topology, reconcileFocusedTeamMemberProjection: mocks.projection,
  applyRunNavigationEffect: vi.fn(),
}) }));
vi.mock('~/stores/voiceInputStore', () => ({ useVoiceInputStore: () => ({
  isAvailable: false, initialize: vi.fn(), cancelOperationForSource: vi.fn(),
}) }));
const ROOT = 'flat-team';
const task = (id = 'fresh-verifier') => testTaskRecord({ taskId: `task-${id}`, delegatorAgentRunId: 'lead',
  recipientAddress: '/verifier', target: { agentRunId: id }, description: `Verify ${id}` });
const execution = (id = 'fresh-verifier') => ({ kind: 'task_agent' as const, address: '/verifier' as const,
  agent_run_id: id, platform_agent_run_id: null, started_at: '2026-08-10T12:00:01.000Z', settled_at: null });
const makeTeam = () => buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/lead', focusedAgentRunId: 'lead',
  rootChildren: [testAgentNode('/lead', { agentRunId: 'lead' }), testAgentNode('/verifier', { agentRunId: 'configured-verifier' })],
});
const status = (agentRunId: string, state = 'idle') => ({ agent_run_id: agentRunId, status: state,
  trigger: null, tool_name: null, error_message: null, error_details: null });
let wrapper: VueWrapper | undefined;
let service: TeamStreamingService | undefined;
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; service?.disconnect(); service = undefined; vi.restoreAllMocks(); });

async function setup() {
  const contexts = useAgentTeamContextsStore();
  contexts.teams = new Map([[ROOT, makeTeam()]]);
  const team = contexts.getTeamContextById(ROOT)!;
  teamRunExecutionTreeDtoSchema.parse(team.view.getExecutionTree());
  useAgentSelectionStore().selectRun(ROOT, 'team');
  const callbacks = new Map<string, (value: any) => void>();
  const recovery = vi.fn();
  const ws = { state: 'connected', connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
    on: vi.fn((event, callback) => callbacks.set(event, callback)), off: vi.fn() };
  service = new TeamStreamingService('ws://example.test/team', { wsClient: ws as any, onStreamRecoveryRequired: recovery });
  service.connect(ROOT, team);
  const emit = (type: string, payload: unknown) => {
    const wire = JSON.stringify({ type, payload });
    parseTeamStreamServerMessage(wire); // The fixture must pass the current strict flat contract.
    callbacks.get('onMessage')!(wire);
  };
  const snapshot = (ids: string[] = [], base = 0) => {
    const tree = structuredClone(team.view.getExecutionTree());
    tree.root_team.task_executions = ids.map(execution);
    return { root_team_run_id: ROOT, base_change_sequence: base, execution_tree: tree,
      tasks: ids.map(task), messages: [], agent_statuses: ['lead', 'configured-verifier', ...ids].map(id => ({ ...status(id), member_address: id === 'lead' ? '/lead' : '/verifier' })) };
  };
  emit('CONNECTED', { session_id: 'initial', root_team_run_id: ROOT });
  emit('TEAM_EXECUTION_VIEW_SNAPSHOT', snapshot());
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/workspace', component: { template: '<div />' } }] });
  await router.push('/workspace');
  let active!: ReturnType<typeof useActiveContextStore>;
  const witnesses: Array<{ entries: string[]; tree: string[]; tasks: string[]; sequence: number }> = [];
  wrapper = mount(defineComponent({ setup() {
    active = useActiveContextStore();
    return () => h(TeamWorkspaceSurface, { target: active.activeWorkspaceTarget!, showHeaderActions: false });
  } }), { global: { plugins: [router], stubs: { Icon: true } } });
  // In addition to the actual synchronous composer dependency, observe the complete
  // association at each publication. Merely reversing two writes is insufficient.
  const stop = watchEffect(() => {
    witnesses.push({ entries: team.view.listAgentContextEntries().map(e => e.agentRunId).sort(),
      tree: collectAgentExecutionLocations(team.view.getExecutionTree()).map(e => e.agentRunId).sort(),
      tasks: team.view.listTaskHistoryRows().map(row => row.targetAgentRunId!).sort(), sequence: team.view.getChangeSequence() });
  }, { flush: 'sync' });
  const warn = vi.spyOn(console, 'warn');
  await wrapper.get('textarea').setValue('next unsent draft');
  return { team, active, emit, snapshot, recovery, ws, witnesses, stop, warn };
}

function expectCoherent(witnesses: Awaited<ReturnType<typeof setup>>['witnesses']) {
  for (const witness of witnesses) {
    expect(witness.entries).toEqual(witness.tree);
    expect(witness.tasks).toEqual(witness.entries.filter(id => id.startsWith('fresh-')));
  }
}

describe('strict flat Team publication with the selected shared composer mounted', () => {
  it('applies activation and its next status without a warning, draft loss, or mixed associations', async () => {
    const { team, active, emit, recovery, ws, witnesses, stop, warn } = await setup();
    try {
      const lead = active.activeAgentContext!;
      emit('TASK_DELEGATION_EVENT', { event_type: 'TASK_AGENT_ACTIVATED', change_sequence: 1,
        parent_team_run_id: ROOT, task: task(), execution: execution() });
      emit('AGENT_STATUS', { ...status('fresh-verifier', 'running'), change_sequence: 2 });
      expect(team.view.getChangeSequence()).toBe(2);
      expect(team.view.needsStreamRecovery()).toBe(false);
      expect(recovery).not.toHaveBeenCalled(); expect(ws.disconnect).not.toHaveBeenCalled();
      expect(warn.mock.calls.some(call => String(call[0]).includes('Rejected Team'))).toBe(false);
      expectCoherent(witnesses);
      expect(active.activeAgentContext).toBe(lead);
      expect(lead.requirement).toBe('next unsent draft');
      expect(team.view.listNavigationRows().find(row => row.agentRunId === 'fresh-verifier'))
        .toMatchObject({ kind: 'task_agent', currentStatus: AgentStatus.Running, task: { taskId: 'task-fresh-verifier' } });
      emit('MEMBER_INPUT_MESSAGE', { change_sequence: 3, recipient_agent_run_id: 'fresh-verifier', message_id: 'input-1',
        dedupe_key: 'input-1', content: 'Exact task input', input_origin: 'inter_agent_delivery',
        received_at: '2026-08-10T12:00:02.000Z', context_file_paths: [], sender_agent_run_id: 'lead', parent_communication_message_id: 'communication-1' });
      team.view.focusAgent('fresh-verifier'); await flushPromises();
      expect(active.activeAgentContext!.state.runId).toBe('fresh-verifier');
      expect(wrapper!.get('[data-testid="agent-event-monitor"]').text()).toContain('Exact task input');
      expect(team.view.getAgentContext('configured-verifier')!.conversation.messages).toEqual([]);
      team.view.focusAgent('lead'); await flushPromises();
      expect(wrapper!.get('textarea').element.value).toBe('next unsent draft');
      await wrapper!.get('textarea').setValue('');
      expect(lead.requirement).toBe(''); expect(ws.send).not.toHaveBeenCalled();
    } finally { stop(); }
  });

  it('publishes a complete reconnect snapshot with two same-address tasks before synchronous readers run', async () => {
    const { team, active, emit, snapshot, recovery, witnesses, stop, warn, ws } = await setup();
    try {
      const lead = active.activeAgentContext!;
      service!.disconnect(); service!.connect(ROOT, team);
      emit('CONNECTED', { session_id: 'replacement', root_team_run_id: ROOT });
      emit('TEAM_EXECUTION_VIEW_SNAPSHOT', snapshot(['fresh-first', 'fresh-second'], 7));
      emit('AGENT_STATUS', { ...status('fresh-second', 'running'), change_sequence: 8 });
      expect(team.view.getChangeSequence()).toBe(8);
      expect(team.view.needsStreamRecovery()).toBe(false);
      expect(recovery).not.toHaveBeenCalled();
      expectCoherent(witnesses);
      expect(active.activeAgentContext).toBe(lead);
      expect(team.view.getAgentExecutionLocation('fresh-second')).toMatchObject({ memberAddress: '/verifier', containingTeamRunId: ROOT });
      expect(team.view.getAgentContext('fresh-second')!.state.currentStatus).toBe(AgentStatus.Running);
      expect(warn.mock.calls.some(call => String(call[0]).includes('Rejected'))).toBe(false);
      expect(ws.send).not.toHaveBeenCalled();
      expect(wrapper!.get('textarea').element.value).toBe('next unsent draft');
      expect(lead.requirement).toBe('next unsent draft');
    } finally { stop(); }
  });

  it.each(['snapshot', 'activation'] as const)('rejects invalid %s without publishing partial identities or consuming the draft', async (kind) => {
    const { team, active, snapshot, witnesses, stop, ws } = await setup();
    try {
      const before = team.view.getExecutionTree();
      const lead = active.activeAgentContext!;
      const count = witnesses.length;
      const result = kind === 'snapshot'
        ? team.view.applySnapshot({ type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
          ...snapshot(['fresh-first', 'fresh-second'], 7), agent_statuses: [
            { ...status('lead'), member_address: '/lead' },
            { ...status('configured-verifier'), member_address: '/verifier' },
          ],
        } } as any)
        : team.view.applyMessage({ type: 'TASK_DELEGATION_EVENT', payload: {
          event_type: 'TASK_AGENT_ACTIVATED', change_sequence: 1,
          parent_team_run_id: 'different-team', task: task(), execution: execution(),
        } } as any);
      expect(result.disposition).toBe('rejected');
      expect(team.view.getExecutionTree()).toBe(before);
      expect(team.view.getChangeSequence()).toBe(0);
      expect(team.view.listAgentContextEntries().map(e => e.agentRunId)).toEqual(['lead', 'configured-verifier']);
      expect(witnesses).toHaveLength(count);
      expect(active.activeAgentContext).toBe(lead);
      expect(team.view.getFocusedAgentRunId()).toBe('lead');
      expect(wrapper!.get('textarea').element.value).toBe('next unsent draft');
      expect(lead.requirement).toBe('next unsent draft');
      expect(ws.send).not.toHaveBeenCalled();
    } finally { stop(); }
  });

});
