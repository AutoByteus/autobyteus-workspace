import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import RunListPanel from '../RunListPanel.vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), toast: vi.fn(), newChat: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/workspace', query: {} }), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: io.toast }) }));
vi.mock('~/composables/runSettings/useRunStart', () => ({ useRunStart: () => ({ newChat: io.newChat }) }));

const day = (offset: number) => new Date(Date.UTC(2026, 9, 30 - offset)).toISOString();
/** A stored Team run with one member, in the shape the history read returns. */
const teamRun = (teamRunId: string, offset: number, address: string) => {
  const agentRunId = `${teamRunId}-${address.slice(1)}`;
  return {
    teamRunId, teamDefinitionId: 'team-def', teamDefinitionName: 'Video Team', coordinatorAddress: address, workspaceRootPath: '/ws/a',
    summary: `${teamRunId} work`, createdAt: day(offset), isActive: false,
    members: [{ memberAddress: address, memberName: address.slice(1), displayName: address.slice(1), agentRunId, workspaceRootPath: '/ws/a', status: 'offline' }],
    rootTeam: {
      team_definition_id: 'team-def', team_definition_name: 'Video Team', team_run_id: teamRunId, coordinator_address: address, task_executions: [],
      members: [{ kind: 'configured_agent', address, agent_definition_id: 'agent-1', role: null, description: null, agent_run_id: agentRunId, platform_agent_run_id: null,
        launch_configuration: { runtime_kind: 'AUTOBYTEUS', llm_model_identifier: 'model-x', llm_config: null, auto_execute_tools: false, workspace_root_path: '/ws/a' } }],
    },
  };
};
const history = (agentRuns: number, teams: ReturnType<typeof teamRun>[] = []): RunHistoryWorkspaceGroup[] => [{
  workspaceRootPath: '/ws/a', workspaceName: 'a',
  agentDefinitions: agentRuns ? [{ agentDefinitionId: 'agent-1', agentName: 'Daily Assistant', runs: Array.from({ length: agentRuns }, (_, index) => ({
    runId: `run-${index + 1}`, summary: `Run ${index + 1}`, createdAt: day(index + 1), status: 'offline', isActive: index === 6, hasCollaboration: false,
  })) }] : [],
  teamDefinitions: teams.length ? [{ teamDefinitionId: 'team-def', teamDefinitionName: 'Video Team', runs: teams }] : [],
}] as unknown as RunHistoryWorkspaceGroup[];

let wrapper: ReturnType<typeof mount> | undefined;
const mountPanel = async () => {
  wrapper = mount(RunListPanel, { props: { runShown: false }, global: { stubs: { Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } } } });
  await flushPromises();
  return wrapper;
};
const rowIds = () => wrapper!.findAll('[data-test="run-list-row"]').map((row) => row.attributes('data-run-id'));

describe('RunListPanel: "Your runs" (UIS-001…005)', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); io.newChat.mockResolvedValue(undefined); });
  afterEach(() => { wrapper?.unmount(); wrapper = undefined; });

  it('is a labelled region with a list of the newest five, then "Show older (N)" / "Show fewer"', async () => {
    useRunHistoryStore().workspaceGroups = history(8);
    await mountPanel();
    expect(wrapper!.get('[data-test="run-list-scroll"]').attributes()).toMatchObject({ role: 'region', 'aria-label': 'Your runs' });
    expect(wrapper!.get('[data-test="run-list"]').attributes('aria-label')).toBe('Your runs');
    expect(rowIds()).toEqual(['run-1', 'run-2', 'run-3', 'run-4', 'run-5']);
    const fold = wrapper!.get('[data-test="run-list-show-older"]');
    expect(fold.text()).toBe('Show older (3)');
    expect(wrapper!.find('[data-test="run-list-archive-older"]').exists()).toBe(false);
    await fold.trigger('click');
    expect(rowIds()).toHaveLength(8);
    expect(fold.text()).toBe('Show fewer');
    expect(fold.attributes('aria-expanded')).toBe('true');
    expect(wrapper!.find('[data-test="run-list-archive-older"]').exists()).toBe(true);
    // Row content: the agent's name, then the run's title; the folder only in the tooltip.
    const first = wrapper!.get('[data-test="run-list-row"][data-run-id="run-1"]');
    expect(first.get('[data-test="run-list-row-name"]').text()).toBe('Daily Assistant');
    expect(first.get('[data-test="run-list-row-title"]').text()).toBe('Run 1');
    expect(first.get('[data-test="workspace-agent-run-row"]').attributes('title')).toBe('Daily Assistant · a');
  });

  it('has no fold with five runs or fewer', async () => {
    useRunHistoryStore().workspaceGroups = history(5);
    await mountPanel();
    expect(rowIds()).toHaveLength(5);
    expect(wrapper!.find('[data-test="run-list-fold"]').exists()).toBe(false);
  });

  it('refuses "Archive all older" while an older run is running, and otherwise archives them after the confirmation', async () => {
    const store = useRunHistoryStore();
    store.workspaceGroups = history(8);
    const archiveRuns = vi.spyOn(store, 'archiveRuns').mockResolvedValue({ archivedRunIds: ['run-6', 'run-8'], failedRunIds: [] });
    await mountPanel();
    await wrapper!.get('[data-test="run-list-show-older"]').trigger('click');
    await wrapper!.get('[data-test="run-list-archive-older"]').trigger('click');
    expect(io.toast).toHaveBeenCalledWith('Stop running runs first.', 'info');
    expect(archiveRuns).not.toHaveBeenCalled();

    // run-7 stops.
    store.workspaceGroups = history(8).map((group) => ({ ...group, agentDefinitions: group.agentDefinitions.map((agent) => ({
      ...agent, runs: agent.runs.map((run) => ({ ...run, isActive: false })) })) }));
    await flushPromises();
    await wrapper!.get('[data-test="run-list-archive-older"]').trigger('click');
    await flushPromises();
    // The existing confirmation dialog (teleported to the document body).
    expect(document.body.textContent).toContain('Archive all runs?');
    expect(document.body.textContent).toContain('Older runs · 3 runs will be hidden from history.');
    const confirm = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Archive all')!;
    confirm.click();
    await flushPromises();
    expect(archiveRuns).toHaveBeenCalledExactlyOnceWith({ agentRunIds: ['run-6', 'run-7', 'run-8'], teamRunIds: [], orgRunIds: [] });
  });

  it('shows loading, a read error with Retry, a refresh error above the list, and the empty invitation', async () => {
    const store = useRunHistoryStore();
    const fetchTree = vi.spyOn(store, 'fetchTree').mockResolvedValue(undefined);
    store.loading = true;
    await mountPanel();
    expect(wrapper!.get('[data-test="run-list-loading"]').text()).toBe('Loading…');

    store.loading = false;
    store.historyFamilyErrors = { workspace: 'down', agentOrg: null };
    await flushPromises();
    expect(wrapper!.get('[data-test="run-list-error"]').text()).toContain('Couldn’t load your runs.');
    await wrapper!.get('[data-test="run-list-retry"]').trigger('click');
    expect(fetchTree).toHaveBeenCalledOnce();

    store.workspaceGroups = history(2);
    await flushPromises();
    expect(wrapper!.get('[data-test="run-list-stale-error"]').text()).toContain('Couldn’t refresh.');
    expect(rowIds()).toEqual(['run-1', 'run-2']);

    store.workspaceGroups = [];
    store.historyFamilyErrors = { workspace: null, agentOrg: null };
    await flushPromises();
    const empty = wrapper!.get('[data-test="run-list-empty"]');
    expect(empty.text()).toContain('No runs yet');
    expect(empty.text()).toContain('Start with Chat.');
    await empty.trigger('click');
    expect(io.newChat).toHaveBeenCalledOnce();
  });

  it('opens a Team run through its focused member\'s stored history, not a blind Team selection', async () => {
    const store = useRunHistoryStore();
    store.workspaceGroups = history(0, [teamRun('team-1', 1, '/super_agent')]);
    const selectTreeRun = vi.spyOn(store, 'selectTreeRun').mockResolvedValue({ disposition: 'committed' } as never);
    await mountPanel();
    await wrapper!.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();
    expect(selectTreeRun).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ teamRunId: 'team-1', memberAddress: '/super_agent' }),
      { selectionIntent: expect.any(Object) },
    );
  });

  it('keeps the open Team run expanded when another Team run is opened', async () => {
    const store = useRunHistoryStore();
    store.workspaceGroups = history(0, [teamRun('team-live', 1, '/live_member'), teamRun('team-history', 2, '/history_member')]);
    vi.spyOn(store, 'selectTreeRun').mockResolvedValue({ disposition: 'committed' } as never);
    useAgentSelectionStore().selectRun('team-live', 'team');
    await mountPanel();
    expect(wrapper!.get('[data-test="workspace-team-row-team-live"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper!.get('[data-test="workspace-team-row-team-history"]').attributes('aria-expanded')).toBe('false');
    await wrapper!.get('[data-test="workspace-team-row-team-history"]').trigger('click');
    await flushPromises();
    expect(wrapper!.get('[data-test="workspace-team-row-team-live"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper!.get('[data-test="workspace-team-row-team-history"]').attributes('aria-expanded')).toBe('true');
  });
});

// autobyteus-390 (REQ-004, AC-005, AC-006): the Runs view turns the shared tree-row move off for every tree inside its
// scroll container; the Workspaces and Projects views keep it. The browser probe (test:e2e:run-expand-motion) proves the
// effect; this pins the scoped rule and its container.
describe('RunListPanel: rows never slide in the Runs view (autobyteus-390)', () => {
  it('scopes a no-transition move rule to the run list\'s scroll container', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(__dirname, '../RunListPanel.vue'), 'utf8');
    const style = source.slice(source.indexOf('<style scoped>')).replace(/\s+/g, ' ');
    expect(style).toContain('.run-list-scroll :deep(.tree-row-move) { transition: none; }');
    expect(source).toMatch(/class="run-list-scroll [^"]*"\s+data-test="run-list-scroll"/);
    const shared = readFileSync(resolve(__dirname, '../../workspace/history/treeRowLeave.css'), 'utf8').replace(/\s+/g, ' ');
    expect(shared).toContain('.tree-row-move { transition: transform 200ms ease-out; }');
  });
});
