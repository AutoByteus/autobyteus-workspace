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
vi.mock('~/composables/projects/useTaskWorkerTasks', () => ({ useTaskWorkerTasks: () => ({ taskOf: () => null, locate: vi.fn() }) }));

import RunListRow from '../RunListRow.vue';
import { useRunListDisclosure } from '~/composables/useRunListDisclosure';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunListSectionActions, RunListSectionState } from '~/components/runList/runListSectionContracts';
import type { RunListEntry } from '~/utils/runListProjection';

// autobyteus-390 (REQ-001…REQ-003, AC-002, AC-003, R-01): an Agent run's delegated rows are mounted only while the run is
// expanded. Kept mounted and hidden (`v-show`), their row group measured the rows at the top of the window and slid them
// down on expand.
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

  it('fold removes the rows from the DOM (not only hidden); unfold shows the same rows again without a second read (R-01)', async () => {
    const { wrapper, toggle } = render();
    await flushPromises();
    const before = rowKeys(wrapper);

    toggle();
    await flushPromises();
    expect(tree(wrapper).exists()).toBe(false);
    expect(wrapper.findAll('[role="treeitem"]')).toHaveLength(0);
    // The stored view stays in the store, so the disclosure stays and can unfold it.
    expect(useAgentRunCollaborationStore().taskRows(HOST).length).toBeGreaterThan(0);
    expect(disclosureButton(wrapper).attributes('aria-expanded')).toBe('false');
    expect(disclosureButton(wrapper).get('[data-icon]').classes()).toContain('-rotate-90');

    toggle();
    await flushPromises();
    expect(tree(wrapper).exists()).toBe(true);
    expect(rowKeys(wrapper)).toEqual(before);
    expect(disclosureButton(wrapper).attributes('aria-expanded')).toBe('true');
    expect(hydration.read).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('the disclosure button folds and unfolds it', async () => {
    const { wrapper } = render();
    await flushPromises();
    await disclosureButton(wrapper).trigger('click');
    expect(tree(wrapper).exists()).toBe(false);
    await disclosureButton(wrapper).trigger('click');
    await flushPromises();
    expect(tree(wrapper).exists()).toBe(true);
    wrapper.unmount();
  });

  it('a folded Agent row renders no Team or Org tree in its place', async () => {
    const { wrapper, toggle } = render();
    await flushPromises();
    toggle();
    await flushPromises();
    expect(wrapper.find('[role="tree"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="agent-org-run-member-tree"]').exists()).toBe(false);
    expect(wrapper.findAll('li[data-test="run-list-row"]')).toHaveLength(1);
    wrapper.unmount();
  });
});
