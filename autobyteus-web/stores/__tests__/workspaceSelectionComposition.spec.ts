import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, shallowReactive } from 'vue';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import AppLeftPanel from '~/components/AppLeftPanel.vue';
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions';
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions';
import { useWorkspaceRouteSelection } from '~/composables/workspace/useWorkspaceRouteSelection';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration';
import { parseAgentOrgHistoryItems } from '~/stores/runHistoryStoreSupport';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { ControlledOrgApollo, rootView, historyData, inspectionData, memberData, OrgTestSocket } from '~/test-support/agentOrgApolloFixture';

let apollo: ControlledOrgApollo;
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => apollo.client }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => false, getBoundEndpoints: () => ({ teamWs: 'ws://controlled.invalid', orgWs: 'ws://controlled.invalid/org' }) }) }));
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }));
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }));
let wrapper: VueWrapper | undefined;
beforeEach(() => { setActivePinia(createPinia()); apollo = new ControlledOrgApollo(); OrgTestSocket.instances = []; vi.stubGlobal('WebSocket', OrgTestSocket); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; useAgentOrgContextsStore().disconnect('org-run'); apollo.client.stop(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const member = (id: string) => ({ teamRunId: 'prior-team', agentRunId: id, memberAddress: `/${id}` });
const respondTeam = (request: ControlledOrgApollo['requests'][number], label = 'loaded') => request.respond({ getTeamMemberRunProjection: {
  __typename: 'TeamMemberRunProjection', agentRunId: request.operation.variables.agentRunId,
  summary: label, lastActivityAt: '2026-09-13T00:00:00.000Z', hasEarlierActiveTraceEvents: false,
  conversation: [{ kind: 'message', role: 'assistant', content: label, ts: 1700000001 }], activities: [],
} });
const setup = async () => {
  const history = useRunHistoryStore();
  vi.spyOn(history, 'resolveWorkspaceMetadataByRootPath').mockResolvedValue(null);
  vi.spyOn(history, 'ensureWorkspaceByRootPath').mockResolvedValue(null);
  vi.spyOn(useAgentTeamRunStore(), 'isTeamStreamReopenRequired').mockReturnValue(false);
  const teams = useAgentTeamContextsStore();
  teams.addTeamContext(buildTestTeamContext({ teamRunId: 'prior-team', coordinatorAddress: '/lead', focusedAgentRunId: 'lead',
    rootChildren: ['lead', 'worker', 'third'].map(id => testAgentNode(`/${id}`, { agentRunId: id })) }));
  const team = teams.getTeamContextById('prior-team')!;
  const staged = stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: rootView(false) });
  await vi.waitFor(() => expect(apollo.pending('GetAgentOrgMemberRunProjection').length).toBeGreaterThan(0));
  apollo.pending('GetAgentOrgMemberRunProjection').forEach(r => r.respond(memberData(r.operation.variables, 'retained')));
  const candidate = await staged;
  candidate.commitActivities();
  const orgs = useAgentOrgContextsStore(); orgs.contexts['org-run'] = shallowReactive(candidate.context);
  orgs.select('org-run', '/team/worker');
  const context = orgs.contextFor('org-run')!;
  const orgAgent = context.selectedTarget()!.context!;
  orgAgent.requirement = 'unsent Org draft';
  history.agentOrgHistory = parseAgentOrgHistoryItems(historyData(false).listCollaborationRootHistory);
  useAgentSelectionStore().selectRun('prior-team', 'team');
  let actions!: ReturnType<typeof useWorkspaceHistorySelectionActions>;
  let execute!: ReturnType<typeof useWorkspaceHistorySubjectActions>['execute'];
  const History = defineComponent({ emits: ['run-selected', 'run-created'], setup(_, { emit }) {
    actions = useWorkspaceHistorySelectionActions({ runHistoryStore: history, selectionStore: useAgentSelectionStore(),
      setTeamExpanded: vi.fn(), toggleTeam: vi.fn(), presentTeamStreamRecoveryFeedback: vi.fn(),
      emitRunSelected: payload => emit('run-selected', payload), emitRunCreated: payload => emit('run-created', payload) });
    execute = useWorkspaceHistorySubjectActions().execute;
    return () => h('div', ['worker', 'third'].map(id => h('button', { 'data-test': id, onClick: () => actions.onSelectTeamMember(member(id)) }, id)));
  } });
  const Workspace = defineComponent({ setup() { useWorkspaceRouteSelection(); return () => h('main'); } });
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/workspace', component: Workspace }, { path: '/agents', component: { template: '<div />' } },
  ] });
  await router.push({ path: '/workspace', query: { rootSubjectKind: 'agent_org', orgRunId: 'org-run', memberAddress: '/team/worker', mode: 'history' } });
  wrapper = mount(defineComponent({ setup: () => () => h('div', [h(AppLeftPanel), h(RouterView)]) }), {
    global: { plugins: [router], stubs: { WorkspaceAgentRunsTreePanel: History, Icon: true } },
  });
  await flushPromises();
  return { history, team, context, orgs, orgAgent, router, actions, execute, selection: useAgentSelectionStore() };
};

describe('explicit selection through actual history/Pinia/hydration/focus/AppLeftPanel/router', () => {
  it.each(['success', 'error'])('late prior Team %s cannot override a newer Org choice or clear its draft', async (completion) => {
    const s = await setup();
    const prior = s.team.view.getAgentContext('worker')!.conversation;
    await wrapper!.get('[data-test="worker"]').trigger('click');
    await vi.waitFor(() => expect(apollo.pending('GetTeamMemberRunProjection')).toHaveLength(1));
    const old = apollo.pending('GetTeamMemberRunProjection')[0];
    await s.execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'select', memberAddress: '/team/worker' });
    if (completion === 'success') respondTeam(old); else old.fail('old load failed');
    await flushPromises();
    expect(s.router.currentRoute.value.query.orgRunId).toBe('org-run');
    expect(s.selection.selectedRunId).toBeNull();
    expect(s.context.selectedAddress).toBe('/team/worker');
    expect(s.orgAgent.requirement).toBe('unsent Org draft');
    expect(s.team.view.getFocusedAgentRunId()).toBe('lead');
    expect(s.team.view.getAgentContext('worker')!.conversation).toBe(prior);
    expect(s.history.selectedTeamRunId).toBeNull();
    expect(s.history.error).toBeNull();
    expect(s.history.getTeamMemberInspectionAttempt('prior-team', 'worker')).toBeNull();
    // Legitimate return succeeds through the same real child event and shell.
    const returning = s.actions.onSelectTeamMember(member('worker'));
    await vi.waitFor(() => expect(apollo.pending('GetTeamMemberRunProjection')).toHaveLength(1));
    respondTeam(apollo.pending('GetTeamMemberRunProjection')[0], 'return'); await returning; await flushPromises();
    expect(s.selection.selectedRunId).toBe('prior-team'); expect(s.team.view.getFocusedAgentRunId()).toBe('worker');
    expect(s.router.currentRoute.value.query).toEqual({});
    expect(s.orgAgent.requirement).toBe('unsent Org draft');
  });
  it('newest same-root member link is processed while old read is pending and old finally cannot strip it', async () => {
    const s = await setup();
    const link = (id: string) => ({ path: '/workspace', query: { workspaceExecutionKind: 'team', workspaceExecutionRunId: 'prior-team', workspaceExecutionAgentRunId: id } });
    await s.router.push(link('worker')); await flushPromises();
    const old = apollo.pending('GetTeamMemberRunProjection')[0]; expect(old).toBeDefined();
    await s.router.push(link('third')); await flushPromises();
    const latest = apollo.pending('GetTeamMemberRunProjection').find(r => r.operation.variables.agentRunId === 'third')!;
    expect(latest).toBeDefined(); respondTeam(old); await flushPromises();
    expect(s.router.currentRoute.value.query.workspaceExecutionAgentRunId).toBe('third');
    expect(s.team.view.getFocusedAgentRunId()).toBe('lead');
    respondTeam(latest); await flushPromises();
    expect(s.team.view.getFocusedAgentRunId()).toBe('third'); expect(s.router.currentRoute.value.query).toEqual({});
  });
  it('route leave invalidates pending selection; Back/Forward can perform a fresh selection', async () => {
    const s = await setup();
    await wrapper!.get('[data-test="worker"]').trigger('click'); await flushPromises();
    const old = apollo.pending('GetTeamMemberRunProjection')[0];
    await s.router.push('/agents'); respondTeam(old); await flushPromises();
    expect(s.router.currentRoute.value.path).toBe('/agents'); expect(s.team.view.getFocusedAgentRunId()).toBe('lead');
    s.router.back(); await flushPromises();
    expect(s.router.currentRoute.value.query.orgRunId).toBe('org-run');
    s.router.forward(); await flushPromises(); expect(s.router.currentRoute.value.path).toBe('/agents');
  });
  it('supersedes a cold Org selecting candidate before publication, preserving a newer Team selection', async () => {
    const s = await setup(); s.orgs.disconnect('org-run');
    const old = s.execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'select', memberAddress: '/director' });
    await vi.waitFor(() => expect(apollo.pending('GetAgentOrgRunInspection')).toHaveLength(1));
    apollo.pending('GetAgentOrgRunInspection')[0].respond(inspectionData(false));
    await vi.waitFor(() => expect(apollo.pending('GetAgentOrgMemberRunProjection').length).toBeGreaterThan(0));
    const choosing = s.actions.onSelectTeamMember(member('worker'));
    await vi.waitFor(() => expect(apollo.pending('GetTeamMemberRunProjection')).toHaveLength(1));
    respondTeam(apollo.pending('GetTeamMemberRunProjection')[0]); await choosing;
    apollo.pending('GetAgentOrgMemberRunProjection').forEach(r => r.respond(memberData(r.operation.variables, 'obsolete')));
    expect(await old).toEqual({ disposition: 'superseded' }); await flushPromises();
    expect(s.orgs.contextFor('org-run')).toBeNull();
    expect(s.selection.selectedRunId).toBe('prior-team'); expect(s.router.currentRoute.value.query).toEqual({});
    expect(useAgentActivityStore().getActivities('agent-director').some(a => a.activityId?.startsWith('obsolete'))).toBe(false);
  });
  it('same-target supersession retains the newest attempt and current error until deliberate retry', async () => {
    const s = await setup();
    apollo.client.defaultOptions.query = { context: { queryDeduplication: false } }; // Control two physical completions, not production policy.
    const first = s.history.inspectTeamMember('prior-team', 'worker');
    await vi.waitFor(() => expect(apollo.pending('GetTeamMemberRunProjection')).toHaveLength(1));
    const second = s.history.inspectTeamMember('prior-team', 'worker');
    await vi.waitFor(() => expect(apollo.pending('GetTeamMemberRunProjection')).toHaveLength(2));
    const [old, current] = apollo.pending('GetTeamMemberRunProjection');
    const owned = s.history.getTeamMemberInspectionAttempt('prior-team', 'worker');
    respondTeam(old); expect(await first).toEqual({ disposition: 'superseded' });
    expect(s.history.getTeamMemberInspectionAttempt('prior-team', 'worker')).toBe(owned);
    expect(owned?.state).toBe('loading');
    current.fail('current unavailable'); expect(await second).toMatchObject({ disposition: 'rejected' });
    expect(s.history.getTeamMemberInspectionAttempt('prior-team', 'worker')).toEqual({ state: 'error', detail: 'current unavailable' });
    expect(s.team.view.getFocusedAgentRunId()).toBe('lead');
    const retry = s.history.inspectTeamMember('prior-team', 'worker');
    await vi.waitFor(() => expect(apollo.pending('GetTeamMemberRunProjection')).toHaveLength(1));
    respondTeam(apollo.pending('GetTeamMemberRunProjection')[0]);
    expect(await retry).toMatchObject({ disposition: 'committed' });
    expect(s.history.getTeamMemberInspectionAttempt('prior-team', 'worker')).toBeNull();
  });
  it('publication-only snapshot/status/input preserves Org route, prior Team focus, explicit intent and draft', async () => {
    const s = await setup();
    await s.execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'select', memberAddress: '/team/worker' });
    const intent = s.selection.selectionIntent;
    const route = s.router.currentRoute.value.fullPath;
    const events: unknown[] = [];
    s.selection.$onAction(({ name }) => events.push(name));
    s.context.requireReopen('transport reconnect');
    const reconnect = s.orgs.openForInspection('org-run');
    await vi.waitFor(() => expect(apollo.pending('GetAgentOrgRunInspection')).toHaveLength(1));
    apollo.pending('GetAgentOrgRunInspection')[0].respond(inspectionData(true));
    await vi.waitFor(() => expect(apollo.pending('GetAgentOrgMemberRunProjection').length).toBeGreaterThan(0));
    apollo.pending('GetAgentOrgMemberRunProjection').forEach(r => r.respond(memberData(r.operation.variables, 'observed')));
    await reconnect;
    const socket = OrgTestSocket.instances[0];
    const view = rootView(true);
    socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'publication' } });
    socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: view } });
    await vi.waitFor(() => expect(apollo.pending('GetAgentOrgMemberRunProjection').length).toBeGreaterThan(0));
    apollo.pending('GetAgentOrgMemberRunProjection').forEach(r => r.respond(memberData(r.operation.variables, 'published')));
    await vi.waitFor(() => expect(s.orgs.contextFor('org-run')?.phase).toBe('live'));
    let sequence = view.base_change_sequence;
    const emit = (message: unknown) => socket.emit({ type: 'ROOT_EXECUTION_EVENT', payload: {
      root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: ++sequence,
      event: { kind: 'agent_presentation', member_address: '/team/worker', agent_run_id: 'agent-task-worker', message },
    } });
    emit({ type: 'AGENT_STATUS', payload: { status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null } });
    emit({ type: 'MEMBER_INPUT_MESSAGE', payload: { message_id: 'published-input', dedupe_key: 'published-input', content: 'published task input',
      input_origin: 'user_message', received_at: '2026-09-13T00:00:00.000Z', context_file_paths: [], sender_agent_run_id: null, parent_communication_message_id: null } });
    await vi.waitFor(() => expect(s.orgs.contextFor('org-run')!.getAgentContext('agent-task-worker')!.conversation.messages.some(m => m.type === 'user' && m.text === 'published task input')).toBe(true));
    expect(s.router.currentRoute.value.fullPath).toBe(route);
    expect(s.selection.selectionIntent).toBe(intent); expect(events).not.toContain('beginSelectionIntent');
    expect(s.orgs.contextFor('org-run')!.selectedAddress).toBe('/team/worker');
    expect(s.orgs.contextFor('org-run')!.selectedTarget()!.context).toBe(s.orgAgent);
    expect(s.orgAgent.requirement).toBe('unsent Org draft');
    expect(s.team.view.getFocusedAgentRunId()).toBe('lead');
    expect(s.history.selectedTeamRunId).toBeNull();
  });

});
