import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive, toRaw } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceAgentOrgHistoryCollection from '../WorkspaceAgentOrgHistoryCollection.vue';
import type { AgentOrgHistoryDefinitionGroup } from '~/stores/runHistoryTypes';
import type { WorkspaceHistorySectionState } from '../workspaceHistorySectionContracts';
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/** CR-003 (REQ-013 / AC-017 via REQ-017): Org members tree shows plain names plus who started a delegated child. */
type OrgTree = ReturnType<typeof taskBearingView>['execution_tree'];
const mountOrg = (isActive: boolean, mutate: (tree: OrgTree) => OrgTree = (tree) => tree) => {
  const tree = mutate(structuredClone(taskBearingView().execution_tree) as OrgTree);
  const group: AgentOrgHistoryDefinitionGroup = {
    stableKey: 'agent_org_definition:org-definition',
    definitionId: 'org-definition',
    name: 'Restored Org',
    runs: [{
      stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run',
      createdAt: tree.createdAt, archivedAt: null, isActive, summary: 'Delegating Org', executionTree: tree,
    }],
  };
  const state = {
    isAgentOrgDefinitionExpanded: () => true,
    isAgentOrgRunExpanded: () => true,
    isAgentOrgTeamExpanded: () => true,
    isAgentOrgRunSelected: () => false,
    isAgentOrgMemberSelected: () => false,
    isAgentOrgTerminating: () => false,
    isAgentOrgDeleting: () => false,
    isAgentOrgArchiving: () => false,
    agentOrgTerminationError: () => null,
    agentOrgContextFor: () => null,
  } as unknown as WorkspaceHistorySectionState;
  const avatars = { showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: vi.fn() };
  const actions = { onInspectAgentOrgExecution: vi.fn() } as never;
  return mount(defineComponent({
    setup: () => () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'ws', groups: [group], state, actions, avatars }),
  }));
};

describe('Org history delegated rows', () => {
  it('shows the plain name, keeps the starter in the accessible label only, and uses the member marker for a task Agent', () => {
    const wrapper = mountOrg(false);
    expect(wrapper.text()).not.toMatch(/Task:/);

    const agentRow = wrapper.get('[data-test="agent-org-task-agent-row-agent-worker-task"]');
    expect(agentRow.text()).toContain('worker');
    expect(wrapper.find('[data-test="agent-org-task-agent-started-by-agent-worker-task"]').exists()).toBe(false);
    expect(agentRow.text()).not.toContain('Started by');
    expect(agentRow.attributes('aria-label')).toContain('Started by director');
    expect(agentRow.find('[data-test="agent-org-task-agent-avatar"]').text()).toBe('W');
    // A stopped run reports every delegated child with the standard offline status.
    expect(agentRow.attributes('data-status')).toBe('offline');
    expect(agentRow.attributes('aria-label')).toContain('offline');

    const teamRow = wrapper.get('[data-test="agent-org-task-team-row-team-task"]');
    expect(teamRow.text()).toContain('team');
    expect(wrapper.find('[data-test="agent-org-task-team-started-by-team-task"]').exists()).toBe(false);
    expect(teamRow.attributes('aria-label')).toContain('Started by director');
    expect(teamRow.attributes('aria-label')).not.toMatch(/Task:/);
  });

  it('draws delegated rows in the clean row style: focus ring, and a slate-500 bolt with a semibold name for a Team (delegated-row-clean-style AC-001)', () => {
    const wrapper = mountOrg(false);
    const agentRow = wrapper.get('[data-test="agent-org-task-agent-row-agent-worker-task"]');
    const teamRow = wrapper.get('[data-test="agent-org-task-team-row-team-task"]');
    for (const row of [agentRow, teamRow]) {
      expect(row.classes()).toEqual(expect.arrayContaining(['text-gray-600', 'hover:bg-gray-50', 'focus:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-indigo-500']));
      expect(row.classes()).not.toContain('border-dashed');
      expect(row.classes()).not.toContain('bg-indigo-50/40');
    }
    const icon = teamRow.get('[data-team-icon="temporary-task-team"]');
    expect(icon.attributes('data-icon')).toBe('heroicons:bolt-20-solid');
    expect(icon.classes()).toEqual(expect.arrayContaining(['h-4', 'w-4', 'text-slate-500']));
    expect(teamRow.find('[data-icon="heroicons:user-group-20-solid"]').exists()).toBe(false);
    expect(teamRow.get('.font-semibold').text()).toContain('team');
  });

  it('gives task-Team members no spawner line because the Team row carries it', () => {
    const wrapper = mountOrg(false);
    for (const member of ['agent-task-lead', 'agent-task-worker']) {
      const row = wrapper.get(`[data-test="agent-org-task-agent-row-${member}"]`);
      expect(row.find(`[data-test="agent-org-task-agent-started-by-${member}"]`).exists()).toBe(false);
      expect(row.attributes('aria-label')).not.toContain('Started by');
    }
  });

  it('shows no starter line for children recorded before the delegator was stored (R-14)', () => {
    const wrapper = mountOrg(false, (tree) => ({
      ...tree,
      rootOrg: {
        ...tree.rootOrg,
        taskExecutions: tree.rootOrg.taskExecutions.map(({ delegatorAgentRunId: _omit, ...task }) => task),
      },
    }) as OrgTree);
    expect(wrapper.find('[data-test="agent-org-task-agent-started-by-agent-worker-task"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="agent-org-task-team-started-by-team-task"]').exists()).toBe(false);
    const agentRow = wrapper.get('[data-test="agent-org-task-agent-row-agent-worker-task"]');
    expect(agentRow.text()).toContain('worker');
    expect(agentRow.attributes('aria-label')).not.toContain('Started by');
  });

  it('falls back to the delegator AgentRun ID when it cannot be resolved in the tree', () => {
    const wrapper = mountOrg(true, (tree) => ({
      ...tree,
      rootOrg: {
        ...tree.rootOrg,
        taskExecutions: tree.rootOrg.taskExecutions.map((task, index) => index === 0 ? { ...task, delegatorAgentRunId: 'ghost-run' } : task),
      },
    }) as OrgTree);
    expect(wrapper.get('[data-test="agent-org-task-agent-row-agent-worker-task"]').attributes('aria-label')).toContain('Started by ghost-run');
  });
});

/** REQ-001..006 / AC-001..005: delegated Team rows disclose like mounted Team rows, keyed by teamRunId. */
const mountWithTreeState = () => {
  const tree = structuredClone(taskBearingView().execution_tree) as OrgTree;
  const run = {
    stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org' as const, rootRunId: 'org-run',
    createdAt: tree.createdAt, archivedAt: null, isActive: false, summary: 'Delegating Org', executionTree: tree,
  };
  const group = reactive<AgentOrgHistoryDefinitionGroup>({ stableKey: 'agent_org_definition:org-definition', definitionId: 'org-definition', name: 'Restored Org', runs: [run] });
  const history = { selectedRunId: null, selectedTeamRunId: null, workspaceGroups: [], navigationTopologyRevision: 0,
    getTreeNodes: () => [], getTeamNodes: () => [], getAgentNavigationAncestry: () => null, getTeamNavigationAncestry: () => null,
    getTeamMemberNavigationAncestorRowKeys: () => [], getAgentOrgNavigationAncestry: () => null };
  const actions = { onInspectAgentOrgExecution: vi.fn(), onSelectAgentOrgMember: vi.fn() };
  const avatars = { showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: vi.fn() };
  let treeState!: ReturnType<typeof useWorkspaceHistoryTreeState>;
  const wrapper = mount(defineComponent({ setup() {
    treeState = useWorkspaceHistoryTreeState({ runHistoryStore: history as never, selectionStore: { selectedType: null, selectedRunId: null } as never });
    treeState.toggleAgentOrgDefinition('ws', 'org-definition');
    treeState.toggleAgentOrgRun('org-run');
    treeState.toggleAgentOrgTeam('org-run', '/team');
    const state = { ...treeState, agentOrgContextFor: () => null } as unknown as WorkspaceHistorySectionState;
    return () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'ws', groups: [group], state, actions: actions as never, avatars });
  } }));
  return { wrapper, treeState, actions, run, group };
};

describe('Org history delegated Team disclosure', () => {
  const taskMembers = ['agent-task-lead', 'agent-task-worker'];
  const memberVisible = (wrapper: ReturnType<typeof mount>, member: string) =>
    wrapper.find(`[data-test="agent-org-task-agent-row-${member}"]`).exists();

  it('starts expanded with a down chevron and members visible', () => {
    const { wrapper } = mountWithTreeState();
    const row = wrapper.get('[data-test="agent-org-task-team-row-team-task"]');
    const chevron = row.get('[data-test="agent-org-task-team-disclosure-team-task"]');
    expect(chevron.attributes('data-icon')).toBe('heroicons:chevron-down-20-solid');
    expect(chevron.classes()).not.toContain('-rotate-90');
    expect(chevron.attributes('aria-hidden')).toBe('true');
    expect(row.attributes('aria-expanded')).toBe('true');
    for (const member of taskMembers) expect(memberVisible(wrapper, member)).toBe(true);
  });

  it('toggles collapse and still inspects the coordinator on every row click', async () => {
    const { wrapper, actions, run } = mountWithTreeState();
    const row = () => wrapper.get('[data-test="agent-org-task-team-row-team-task"]');
    await row().trigger('click');
    expect(row().attributes('aria-expanded')).toBe('false');
    expect(row().get('[data-test="agent-org-task-team-disclosure-team-task"]').classes()).toContain('-rotate-90');
    for (const member of taskMembers) expect(memberVisible(wrapper, member)).toBe(false);
    expect(actions.onInspectAgentOrgExecution).toHaveBeenCalledExactlyOnceWith(run, 'agent-task-lead', '/team/lead');
    expect(actions.onSelectAgentOrgMember).not.toHaveBeenCalled();

    await row().trigger('click');
    expect(row().attributes('aria-expanded')).toBe('true');
    for (const member of taskMembers) expect(memberVisible(wrapper, member)).toBe(true);
    expect(actions.onInspectAgentOrgExecution).toHaveBeenCalledTimes(2);
  });

  it('keeps the delegated Team state independent of the mounted Team with the same address', async () => {
    const { wrapper, treeState } = mountWithTreeState();
    await wrapper.get('[data-test="agent-org-task-team-row-team-task"]').trigger('click');
    expect(treeState.isAgentOrgTeamExpanded('org-run', '/team')).toBe(true);
    expect(wrapper.get('[data-test="agent-org-team-row-team-configured"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[data-test="agent-org-agent-row-agent-lead-configured"]').exists()).toBe(true);

    await wrapper.get('[data-test="agent-org-team-row-team-configured"]').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-test="agent-org-agent-row-agent-lead-configured"]').exists()).toBe(false);
    expect(treeState.isAgentOrgTaskTeamExpanded('org-run', 'team-task')).toBe(false);
    await wrapper.get('[data-test="agent-org-task-team-row-team-task"]').trigger('click');
    expect(treeState.isAgentOrgTaskTeamExpanded('org-run', 'team-task')).toBe(true);
    expect(treeState.isAgentOrgTeamExpanded('org-run', '/team')).toBe(false);
    for (const member of taskMembers) expect(memberVisible(wrapper, member)).toBe(true);
  });

  /** API-TTRC-002 (REQ-003 / REQ-005): a live execution-tree update re-projects rows without reopening a collapsed delegated Team. */
  it('keeps a collapsed delegated Team collapsed when the live execution tree gains a member', async () => {
    const { wrapper, group } = mountWithTreeState();
    const row = () => wrapper.get('[data-test="agent-org-task-team-row-team-task"]');
    await row().trigger('click');
    expect(row().attributes('aria-expanded')).toBe('false');

    const next = structuredClone(toRaw(group.runs[0]!).executionTree);
    const delegated = next.rootOrg.taskExecutions.find((task) => 'teamRunId' in task && task.teamRunId === 'team-task')!;
    (delegated as { members: unknown[] }).members.push({ address: '/team/worker', agentRunId: 'agent-task-worker-late', platformAgentRunId: null });
    group.runs[0] = { ...group.runs[0]!, isActive: true, executionTree: next };
    await nextTick();

    expect(row().attributes('aria-expanded')).toBe('false');
    expect(memberVisible(wrapper, 'agent-task-worker-late')).toBe(false);
    for (const member of taskMembers) expect(memberVisible(wrapper, member)).toBe(false);

    await row().trigger('click');
    expect(row().attributes('aria-expanded')).toBe('true');
    for (const member of [...taskMembers, 'agent-task-worker-late']) expect(memberVisible(wrapper, member)).toBe(true);
  });
});
