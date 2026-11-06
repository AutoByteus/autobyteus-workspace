import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive } from 'vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

const active = vi.hoisted(() => ({ state: null as null | { target: any } }));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return active.state!.target; } }) }));
const remote = vi.hoisted(() => ({ unreachable: false }));
vi.mock('~/composables/remoteRuns/useRemoteRunView', async () => {
  const { computed: c } = await import('vue');
  return { useRemoteRunView: () => ({
    remote: c(() => (remote.unreachable ? { nodeName: 'office-mac', reachable: false } : null)),
    unreachable: c(() => remote.unreachable), headerActionsAllowed: c(() => true),
    composerPlaceholder: (local: string | null) => local, retry: vi.fn(),
  }) };
});

import MobileRunScreen from '../MobileRunScreen.vue';
import { useMobileRunOpeningStore } from '~/stores/mobileRunOpeningStore';
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';

const contextOf = (runId: string, name: string) => reactive({
  submissionPending: false,
  config: { agentDefinitionId: 'def', agentDefinitionName: name, agentAvatarUrl: null, runtimeKind: 'autobyteus' },
  state: { runId, currentStatus: 'idle', conversation: { messages: [] }, eventMonitorPresentationRevision: 0, hasEarlierActiveTraceEvents: false },
});
const targetOf = (kind: string, runId: string, name: string) => ({ kind, access: 'live', context: contextOf(runId, name), browse: { kind: 'run', runId }, workspaceRootPath: null,
  ...(kind === 'standalone_agent' ? {} : { team: { focusedMemberAddress: '/team/m', teamDefinitionName: 'Team' }, collaborationMessages: { memberIdentityByAgentRunId: () => ({}) } }) });
const tree = (parentName: string | null) => ({ openRowParent: computed(() => (parentName ? { name: parentName } : null)) });

let pinia: Pinia;
const mountScreen = async (parentName: string | null = null) => {
  const router = await createMobileTestRouter();
  await router.push({ path: '/mobile', query: { screen: 'run' } });
  const wrapper = mount(MobileRunScreen, { props: { tree: tree(parentName) as never }, global: { plugins: [router, pinia], stubs: { AgentEventMonitor: { name: 'AgentEventMonitor', props: ['agentName', 'runId', 'readOnly'], template: '<div data-testid="conversation-stub">{{ agentName }}:{{ runId }}</div>' } } } });
  await flushPromises();
  return { router, wrapper };
};

// autobyteus-277 REQ-003, AR-001, MP-001.
describe('MobileRunScreen', () => {
  beforeEach(() => { pinia = createPinia(); setActivePinia(pinia); active.state = reactive({ target: null }); remote.unreachable = false; });

  it('while an open is pending it shows "Opening…" only, never the previous target', async () => {
    active.state!.target = targetOf('standalone_agent', 'previous-run', 'Previous Agent');
    useMobileRunOpeningStore().begin('agent:next');
    const { wrapper } = await mountScreen();
    expect(wrapper.get('[data-testid="mobile-run-opening"]').text()).toBe('Opening…');
    expect(wrapper.find('[data-testid="mobile-run-conversation"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Previous Agent');
    expect(wrapper.find('[data-testid="mobile-run-menu-button"]').exists()).toBe(false);
  });

  it('then the open target: its name, its state and where it is, and its conversation', async () => {
    useMobileRunOpeningStore().begin('team:t/m');
    const { wrapper } = await mountScreen('Software Engineering Team');
    active.state!.target = targetOf('agent_run_task_team_member', 'member-run', 'solution_designer');
    useMobileRunOpeningStore().commit('team:t/m');
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-run-name"]').text()).toBe('solution_designer');
    expect(wrapper.get('[data-testid="mobile-run-subtitle"]').text()).toBe('Idle · in Software Engineering Team');
    expect(wrapper.get('[data-testid="mobile-run-conversation"]').text()).toBe('solution_designer:member-run');
  });

  it('a top-level run has no "in"', async () => {
    active.state!.target = targetOf('standalone_agent', 'run-1', 'Daily Assistant');
    const { wrapper } = await mountScreen(null);
    expect(wrapper.get('[data-testid="mobile-run-subtitle"]').text()).toBe('Idle');
  });

  // Product finding 1 (E-20): a new run's id changes at its first message; the screen reads the target, not a copy.
  it('keeps the conversation open when the run\'s temporary id is promoted', async () => {
    const target = targetOf('standalone_agent', 'temp-123', 'Project Task Manager');
    active.state!.target = target;
    const { router, wrapper } = await mountScreen();
    target.context.state.runId = 'run-permanent';
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-run-conversation"]').text()).toBe('Project Task Manager:run-permanent');
    expect(router.currentRoute.value.query.screen).toBe('run');
  });

  it('a failed open goes back to the list', async () => {
    useMobileRunOpeningStore().begin('agent:x');
    const { router } = await mountScreen();
    useMobileRunOpeningStore().fail('agent:x');
    await flushPromises();
    expect(router.currentRoute.value.query.screen).toBeUndefined();
  });

  it('with neither an open pending nor a target (a reload) it is replaced by the list', async () => {
    const { router } = await mountScreen();
    expect(router.currentRoute.value.query.screen).toBeUndefined();
  });

  it.each([
    ['standalone_agent', false], ['agent_run_task_agent', false], ['standalone_team_member', true], ['agent_run_task_team_member', true],
  ])('the ⋮ menu of a %s offers Messages=%s', async (kind, messages) => {
    active.state!.target = targetOf(kind, 'r', 'Agent');
    const { wrapper } = await mountScreen();
    await wrapper.get('[data-testid="mobile-run-menu-button"]').trigger('click');
    const items = wrapper.findAll('[role="menuitem"]').map((item) => item.text());
    expect(items).toEqual(messages ? ['Artifacts', 'Files', 'Messages', 'Activity'] : ['Artifacts', 'Files', 'Activity']);
  });

  it('a menu item opens its view screen', async () => {
    active.state!.target = targetOf('standalone_agent', 'r', 'Agent');
    const { router, wrapper } = await mountScreen();
    await wrapper.get('[data-testid="mobile-run-menu-button"]').trigger('click');
    await wrapper.get('[data-testid="mobile-run-menu-files"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.screen).toBe('files');
  });

  it('a run on a node that does not answer shows the remote notice instead of the conversation', async () => {
    remote.unreachable = true;
    active.state!.target = targetOf('agent_run_task_agent', 'remote-run', 'Market Researcher');
    const { wrapper } = await mountScreen('Project Task Manager');
    expect(wrapper.find('[data-testid="mobile-run-unreachable"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-run-conversation"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="mobile-run-subtitle"]').text()).toBe('Not reachable');
  });
});
