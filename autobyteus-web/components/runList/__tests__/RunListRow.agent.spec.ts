import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, reactive, shallowReactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMultiTeamContext, multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));
const hydration = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: hydration.read,
  buildAgentRunCollaborationContext: vi.fn(async ({ view }) => shallowReactive(buildMultiTeamContext(view))),
}));
vi.mock('~/services/agentCollaboration/agentRunCollaborationChildHydration', () => ({
  hydrateAgentRunCollaborationChild: vi.fn(async () => 'hydrated'),
}));
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ getTeamMemberInspectionAttempt: () => null }) }));
// Every delegated row is on a Task; the composable is what asks for the Task answers (one ask per mount).
const tasks = vi.hoisted(() => ({ use: vi.fn() }));
vi.mock('~/composables/projects/useTaskWorkerTasks', () => ({ useTaskWorkerTasks: tasks.use }));
const TASK = { taskId: 'task-1', projectId: 'project-1', title: 'Ship the release notes', description: 'Ship the release notes', status: 'IN_PROGRESS' };

import RunListRow from '../RunListRow.vue';
import { useRunListDisclosure } from '~/composables/useRunListDisclosure';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunListSectionActions, RunListSectionState } from '~/components/runList/runListSectionContracts';
import type { RunListEntry } from '~/utils/runListProjection';

// autobyteus-390 SR-002 (REQ-002, REQ-003, AC-002, AC-003, R-01): an Agent run's delegated rows stay mounted while the run
// is folded, only hidden, so they keep their Task answers and show complete on unfold (no late Task line, CRR-001 CR-001).
// That rows never slide is the Runs view's scoped rule (RunListPanel.spec) and the browser probe's.
const HOST = 'host-run';
const agentEntry = (): RunListEntry => ({
  kind: 'agent', key: `agent:${HOST}`, runId: HOST, name: 'Project Task Manager', lastActivityAt: '2026-11-06T00:00:00.000Z',
  isActive: false, folderRootPath: '/ws/a', agentDefinitionId: 'pm', avatarUrl: null,
  run: {
    runId: HOST, summary: 'Plan the release', lastActivityAt: '2026-11-06T00:00:00.000Z', createdAt: '2026-11-06T00:00:00.000Z',
    currentStatus: AgentStatus.Offline, isActive: false, source: 'history', hasCollaboration: true,
  } as never,
});

const AVATARS = {
  showAgentAvatar: () => false, getAgentInitials: () => 'PM', onAgentAvatarError: () => {},
  showTeamAvatar: () => false, getTeamAvatarUrl: () => '', onTeamAvatarError: () => {},
  showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: () => {},
} as never;

const render = () => {
  // Partial: an Agent row's fold reaches none of the actions.
  const actions = { onSelectRun: vi.fn() } as unknown as RunListSectionActions;
  let disclosure!: ReturnType<typeof useRunListDisclosure>;
  const wrapper = mount(defineComponent({ setup() {
    disclosure = useRunListDisclosure({
      runHistoryStore: reactive({ selectedRunId: null, selectedTeamRunId: null, navigationTopologyRevision: 0, getTeamMemberNavigationAncestorRowKeys: () => [] }),
      runListStore: reactive({ entries: [agentEntry()], showRun: vi.fn() }),
      selectionStore: { selectedType: null, selectedRunId: null },
    });
    const state = { ...disclosure, selectedRunId: null, isRunTerminating: () => false, isRunArchiving: () => false, isRunDeleting: () => false } as unknown as RunListSectionState;
    return () => h('ul', [h(RunListRow, { entry: agentEntry(), state, actions, avatars: AVATARS, folderLabel: 'a', relative: () => '1h' })]);
  } }), { attachTo: document.body, global: { stubs: { transition: false, 'transition-group': false } } });
  return { wrapper, toggle: () => disclosure.toggleRun(HOST) };
};
const tree = (wrapper: ReturnType<typeof render>['wrapper']) => wrapper.find('[data-test="workspace-agent-run-task-tree"]');
const disclosureButton = (wrapper: ReturnType<typeof render>['wrapper']) => wrapper.get('[data-test="run-list-disclosure"]');
const rowKeys = (wrapper: ReturnType<typeof render>['wrapper']) =>
  tree(wrapper).findAll('[role="treeitem"]').map((row) => row.attributes('data-agent-run-id') ?? row.attributes('data-node-kind'));

describe('RunListRow: an Agent run\'s delegated rows (autobyteus-390)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    hydration.read.mockImplementation(async () => multiTeamView());
    tasks.use.mockImplementation(() => ({ taskOf: () => TASK, locate: vi.fn() }));
  });

  it('expanded at first: the stored delegated rows load once and show; the disclosure says expanded', async () => {
    const { wrapper } = render();
    await flushPromises();
    expect(hydration.read).toHaveBeenCalledTimes(1);
    expect(tree(wrapper).exists()).toBe(true);
    expect(tree(wrapper).findAll('[role="treeitem"]').length).toBeGreaterThan(0);
    expect(disclosureButton(wrapper).attributes('aria-expanded')).toBe('true');
    wrapper.unmount();
  });

  it('fold hides the rows and keeps them, with their Task lines; unfold shows the same rows with no new read (R-01)', async () => {
    const { wrapper, toggle } = render();
    await flushPromises();
    const before = rowKeys(wrapper);
    const taskLines = wrapper.findAll('[data-test="workspace-task-worker-task-summary"]').length;
    expect(taskLines).toBeGreaterThan(0);
    const mountedTree = tree(wrapper).element;

    toggle();
    await flushPromises();
    expect(tree(wrapper).exists()).toBe(true);
    expect((tree(wrapper).element as HTMLElement).style.display).toBe('none');
    expect(tree(wrapper).isVisible()).toBe(false);
    expect(useAgentRunCollaborationStore().taskRows(HOST).length).toBeGreaterThan(0);
    expect(disclosureButton(wrapper).attributes('aria-expanded')).toBe('false');
    expect(disclosureButton(wrapper).get('[data-icon]').classes()).toContain('-rotate-90');

    toggle();
    await flushPromises();
    expect(tree(wrapper).isVisible()).toBe(true);
    // The same mounted rows: their Task lines are there at once, with no second ask for the Task answers or the view.
    expect(tree(wrapper).element).toBe(mountedTree);
    expect(rowKeys(wrapper)).toEqual(before);
    expect(wrapper.findAll('[data-test="workspace-task-worker-task-summary"]')).toHaveLength(taskLines);
    expect(tasks.use).toHaveBeenCalledTimes(1);
    expect(disclosureButton(wrapper).attributes('aria-expanded')).toBe('true');
    expect(hydration.read).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('the disclosure button folds and unfolds it', async () => {
    const { wrapper } = render();
    await flushPromises();
    await disclosureButton(wrapper).trigger('click');
    expect(tree(wrapper).isVisible()).toBe(false);
    await disclosureButton(wrapper).trigger('click');
    await flushPromises();
    expect(tree(wrapper).isVisible()).toBe(true);
    wrapper.unmount();
  });

  it('a folded Agent row renders no Team or Org tree in its place', async () => {
    const { wrapper, toggle } = render();
    await flushPromises();
    toggle();
    await flushPromises();
    // Only its own (hidden) delegated tree.
    expect(wrapper.findAll('[role="tree"]').map((node) => node.attributes('data-test'))).toEqual(['workspace-agent-run-task-tree']);
    expect(wrapper.find('[data-test="agent-org-run-member-tree"]').exists()).toBe(false);
    expect(wrapper.findAll('li[data-test="run-list-row"]')).toHaveLength(1);
    wrapper.unmount();
  });
});
