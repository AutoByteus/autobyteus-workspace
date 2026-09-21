import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { taskDelegationRecordDtoSchema, teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import CollaborationDelegatedTasksSection from '../CollaborationDelegatedTasksSection.vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { GetTeamMemberRunProjection } from '~/graphql/queries/runHistoryQueries';
import { openWorkspaceExecutionLink } from '~/services/workspace/workspaceNavigationService';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query, mutate: mocks.mutate }) }));
const ROOT = 'standalone-team';
const SETTLED = '2026-09-01T00:05:00.000Z';
const task = (id: string) => testTaskRecord({ taskId: `task-${id}`, delegatorAgentRunId: 'lead',
  recipientAddress: '/verifier', target: { agentRunId: id }, status: 'accepted', description: 'Verify the exact result',
  updates: [
    { kind: 'submission', submission_id: `submission-${id}`, message: 'Exact result', reference_files: [], created_at: '2026-09-01T00:03:00.000Z' },
    { kind: 'review', review_id: `review-${id}`, reviewed_submission_id: `submission-${id}`, decision: 'accept', comment: null,
      reference_files: [], created_at: '2026-09-01T00:04:00.000Z' },
  ],
});
const makeTeam = (active = true, settled = true) => buildTestTeamContext({ teamRunId: ROOT, isActive: active,
  coordinatorAddress: '/lead', focusedAgentRunId: 'lead', rootChildren: [
    testAgentNode('/lead', { agentRunId: 'lead' }), testAgentNode('/verifier', { agentRunId: 'configured-verifier' }),
  ], tasks: [task('verifier-one'), task('verifier-two')],
  taskExecutions: ['verifier-one', 'verifier-two'].map(id => ({ kind: 'task_agent', address: '/verifier',
    agent_run_id: id, platform_agent_run_id: null, started_at: '2026-09-01T00:02:00.000Z', settled_at: settled ? SETTLED : null })),
});
const projection = (id: string) => ({ data: { getTeamMemberRunProjection: {
  agentRunId: id, conversation: [{ kind: 'assistant', role: 'assistant', content: `Answer for ${id}`, ts: 10 }],
  activities: [{ kind: 'system_instruction', activityId: `activity-${id}`, content: `Activity for ${id}`, ts: 11 }],
  hasEarlierActiveTraceEvents: true, lastActivityAt: SETTLED,
} } });
let wrapper: VueWrapper | undefined;
beforeEach(() => { setActivePinia(createPinia()); mocks.query.mockReset(); mocks.mutate.mockReset(); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });
const setup = async (active = true, settled = true) => {
  const contexts = useAgentTeamContextsStore();
  contexts.teams = new Map([[ROOT, makeTeam(active, settled)]]);
  const team = contexts.getTeamContextById(ROOT)!;
  teamRunExecutionTreeDtoSchema.parse(team.view.getExecutionTree());
  team.view.listTaskHistoryRows().forEach(row => taskDelegationRecordDtoSchema.parse(row.task));
  useAgentSelectionStore().selectRun(ROOT, 'team');
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/workspace', component: { template: '<div />' } }] });
  await router.push('/workspace');
  mocks.query.mockImplementation(async ({ query, variables }) => {
    if (query !== GetTeamMemberRunProjection || variables.teamRunId !== ROOT) throw new Error('Unexpected read');
    return projection(variables.agentRunId);
  });
  let store!: ReturnType<typeof useActiveContextStore>;
  wrapper = mount(defineComponent({ setup() {
    store = useActiveContextStore();
    const target = store.activeWorkspaceTarget!;
    if (!('collaborationTasks' in target)) throw new Error('Expected Team tasks');
    return () => h(CollaborationDelegatedTasksSection, { tasks: (store.activeWorkspaceTarget as typeof target).collaborationTasks });
  } }), { global: { plugins: [router], stubs: {
    Icon: { template: '<span />' }, MarkdownRenderer: { props: ['content'], template: '<article>{{ content }}</article>' },
  } } });
  const run = useAgentTeamRunStore();
  const commands = ['sendMessageToFocusedMember', 'interruptFocusedMemberGeneration', 'postToolExecutionApproval', 'connectToTeamStream', 'disconnectTeamStream'] as const;
  const writes = commands.map(name => vi.spyOn(run, name));
  return { contexts, team, store, router, writes };
};
const clickVerifier = async (index = 0) => {
  await wrapper!.findAll('[data-test="team-delegated-task-summary-row"]')[index].trigger('click');
  await wrapper!.get('[data-test="task-identity-toggle"]').trigger('click');
  const links = wrapper!.get('[data-test="task-identity-detail"]').findAll('[data-test="task-identity-agent"]');
  await links[1].trigger('click');
  await flushPromises();
};

describe('shared task detail -> retained standalone Team inspection', () => {
  it.each([true, false])('hydrates exact settled tasks under active=%s without commands, restore or same-address substitution', async active => {
    const { team, store, router, writes } = await setup(active);
    const initialTree = JSON.stringify(team.view.getExecutionTree());
    let release!: (value: unknown) => void;
    mocks.query.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    await clickVerifier();
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.query.mock.calls[0][0].variables).toEqual({ teamRunId: ROOT, agentRunId: 'verifier-one' });
    expect(team.view.getFocusedAgentRunId()).toBe('lead');
    expect(router.currentRoute.value.query).toEqual({});
    release(projection('verifier-one')); await flushPromises();
    for (const [index, id] of ['verifier-one', 'verifier-two'].entries()) {
      if (index) {
        await openWorkspaceExecutionLink({ kind: 'team', teamRunId: ROOT, agentRunId: 'lead' });
        await flushPromises();
        await clickVerifier(index);
      }
      expect(team.view.getFocusedAgentRunId()).toBe(id);
      expect(router.currentRoute.value.query.workspaceExecutionAgentRunId).toBe(id);
      expect(useAgentSelectionStore().selectedRunId).toBe(ROOT);
      expect(store.activeWorkspaceTarget).toMatchObject({ access: 'read_only', kind: 'standalone_team_member',
        context: { state: { runId: id, conversation: { id, messages: [expect.objectContaining({ type: 'ai' })] } } },
        browse: { kind: 'teamMember', teamRunId: ROOT, agentRunId: id, memberAddress: '/verifier' },
      });
      expect(store.activeWorkspaceTarget).not.toHaveProperty('interaction');
      expect(JSON.stringify(store.activeAgentContext!.state.conversation)).toContain(`Answer for ${id}`);
      expect(useAgentActivityStore().getActivities(id)).toEqual([expect.objectContaining({ activityId: `activity-${id}` })]);
      expect(team.view.getFocusedNavigationRow()?.task).toMatchObject({ taskId: `task-${id}`, displayStatus: 'accepted' });
      if (active) expect(team.view.listNavigationRows().some(row => row.agentRunId === id)).toBe(false);
      await store.interruptGeneration();
      await expect(store.postToolExecutionApproval('not-executed', true)).rejects.toThrow('No active workspace target');
      store.updateRequirement('must not send');
      await expect(store.send()).rejects.toThrow('No active workspace target');
    }
    expect(team.view.isRootTeamActive()).toBe(active);
    expect(JSON.stringify(team.view.getExecutionTree())).toBe(initialTree);
    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(mocks.mutate).not.toHaveBeenCalled();
    writes.forEach(write => expect(write).not.toHaveBeenCalled());
    expect(team.view.getAgentContext('configured-verifier')!.state.conversation.messages).toEqual([]);
  });

  it.each(['missing', 'wrong-projection', 'unavailable', 'root-replaced'] as const)('keeps prior focus and selection on strict %s failure', async failure => {
    const { contexts, team, store } = await setup();
    const previous = store.activeWorkspaceTarget;
    if (failure === 'wrong-projection') mocks.query.mockResolvedValueOnce(projection('configured-verifier'));
    if (failure === 'unavailable') mocks.query.mockRejectedValueOnce(new Error('Projection unavailable'));
    if (failure === 'root-replaced') mocks.query.mockImplementationOnce(async () => {
      contexts.teams = new Map([[ROOT, makeTeam()]]); return projection('verifier-one');
    });
    await expect(openWorkspaceExecutionLink({ kind: 'team', teamRunId: ROOT,
      agentRunId: failure === 'missing' ? 'unknown' : 'verifier-one' })).rejects.toThrow();
    expect(team.view.getFocusedAgentRunId()).toBe('lead');
    expect(useAgentSelectionStore().selectedRunId).toBe(ROOT);
    expect(team.view.getAgentContext('verifier-one')!.state.conversation.messages).toEqual([]);
    expect(useRunHistoryStore().teamMemberInspectionByIdentity[`${ROOT}\u0000${failure === 'missing' ? 'unknown' : 'verifier-one'}`]?.state).toBe('error');
    if (failure !== 'root-replaced') expect(store.activeWorkspaceTarget).toBe(previous);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('repairs a live task focus on settlement, then retains deliberate read-only inspection through later task events', async () => {
    const { team, store } = await setup(true, false);
    await clickVerifier();
    expect(store.activeWorkspaceTarget?.access).toBe('live');
    const settle = (id: string, sequence: number) => team.view.applyMessage({ type: 'TASK_DELEGATION_EVENT', payload: {
      event_type: 'TASK_EXECUTION_SETTLED', change_sequence: sequence, task: task(id),
      execution: { agent_run_id: id }, settled_at: SETTLED,
    } });
    expect(settle('verifier-one', 1)).toMatchObject({ disposition: 'applied', effects: expect.arrayContaining([{ kind: 'reconcile_focused_team_member_projection' }]) });
    expect(team.view.getFocusedAgentRunId()).toBe('lead');
    expect(team.view.focusAgent('verifier-one').disposition).toBe('rejected');
    await openWorkspaceExecutionLink({ kind: 'team', teamRunId: ROOT, agentRunId: 'verifier-one' });
    expect(store.activeWorkspaceTarget?.access).toBe('read_only');
    expect(settle('verifier-two', 2).disposition).toBe('applied');
    expect(team.view.getFocusedAgentRunId()).toBe('verifier-one');
    expect(team.view.listNavigationRows().map(row => row.agentRunId)).not.toContain('verifier-one');
    expect(team.view.focusAgent('lead').disposition).toBe('applied');
    expect(store.activeWorkspaceTarget?.access).toBe('live');
  });
});
