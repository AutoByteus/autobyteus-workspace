import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, nextTick, reactive, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceAgentOrgHistoryCollection from '../WorkspaceAgentOrgHistoryCollection.vue';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import { useRunHistoryAvatarState } from '~/composables/useRunHistoryAvatarState';
import type { OrgWorkspaceSelection } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex';
import type { AgentOrgHistoryDefinitionGroup } from '~/stores/runHistoryTypes';
import type { WorkspaceHistorySectionState } from '../workspaceHistorySectionContracts';
vi.mock('@iconify/vue', () => ({ Icon: {props: ['icon'], template: '<span :data-icon="icon" />'} }));

const agentOrgDefinitionGroup = (): AgentOrgHistoryDefinitionGroup => {
  const launch = {
    runtimeKind: 'codex_app_server' as const,
    llmModelIdentifier: 'gpt-5.6-sol',
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY' as const,
    workspaceRootPath: '/ws/a',
  };
  return {
    stableKey: 'agent_org_definition:org-definition',
    definitionId: 'org-definition',
    name: 'Delivery Org',
    runs: [{
      stableKey: 'agent_org_run:org-run',
      rootSubjectKind: 'agent_org',
      rootRunId: 'org-run',
      createdAt: '2026-09-03T00:00:00.000Z',
      archivedAt: null,
      isActive: true,
      summary: 'Deliver current package',
      executionTree: {
        schemaVersion: 1,
        subjectKind: 'agent_org',
        createdAt: '2026-09-03T00:00:00.000Z',
        archivedAt: null,
        applicationBinding: null,
        handoffs: [],
        rootOrg: {
          address: '/', orgDefinitionId: 'org-definition', orgDefinitionName: 'Delivery Org', orgRunId: 'org-run',
          defaultLaunchConfiguration: launch, taskExecutions: [],
          members: [{
            address: '/software', teamDefinitionId: 'software-team', role: null, description: null,
            teamRunId: 'mounted-team-run', coordinatorAddress: '/software/implementation',
            defaultLaunchConfiguration: launch, taskExecutions: [],
            members: [{
              address: '/software/implementation', agentDefinitionId: 'implementation-agent', role: null,
              description: null, agentRunId: 'implementation-run', platformAgentRunId: null,
              launchConfiguration: launch,
            }],
          }],
        },
      },
    }],
  };
};

const harness = (active = true, selected = true) => {
  const group = reactive(agentOrgDefinitionGroup());
  group.runs[0]!.isActive = active;
  const sibling = { ...group.runs[0]!, rootRunId: 'sibling', stableKey: 'sibling' };
  group.runs.push(sibling);
  const selectedOrg = ref<{rootRunId: string; focusAddress: string | null; selection: OrgWorkspaceSelection | null} | null>(selected ? { rootRunId: 'org-run', focusAddress: '/software/implementation',
    selection: { kind: 'agent_execution' as const, agentRunId: 'implementation-run' } } : null);
  const draft = reactive({ text: 'Unsaved work', conversation: [{ text: 'Existing message' }] });
  const history = reactive({ selectedRunId: null, selectedTeamRunId: null, workspaceGroups: [], navigationTopologyRevision: 0,
    getTreeNodes: () => [], getTeamNodes: () => [], getAgentNavigationAncestry: () => null,
    getTeamNavigationAncestry: () => null, getTeamMemberNavigationAncestorRowKeys: () => [],
    getAgentOrgNavigationAncestry: () => ({ workspaceId: 'ws', definitionId: 'org-definition', teamAddresses: ['/software'] }),
  });
  const actions = { onRemoveWorkspace: vi.fn(), onCreateRun: vi.fn(), onSelectRun: vi.fn(), onTerminateRun: vi.fn(), onArchiveRun: vi.fn(), onDeleteRun: vi.fn(), onTerminateTeam: vi.fn(), onArchiveTeam: vi.fn(), onDeleteTeam: vi.fn(), onSelectTeam: vi.fn(), onSelectTeamMember: vi.fn(), onOpenAgentOrgRun: vi.fn(), onSelectAgentOrgMember: vi.fn(), onInspectAgentOrgExecution: vi.fn(), onTerminateAgentOrg: vi.fn(), onArchiveAgentOrg: vi.fn(), onDeleteAgentOrg: vi.fn() };
  const definitions = ref<{id: string; avatarUrl?: string | null}[]>([]);
  let tree: ReturnType<typeof useWorkspaceHistoryTreeState>;
  let avatars: ReturnType<typeof useRunHistoryAvatarState>;
  const wrapper = mount(defineComponent({ setup() {
    tree = useWorkspaceHistoryTreeState({ runHistoryStore: history, selectionStore: {selectedType: null, selectedRunId: null}, selectedAgentOrg: selectedOrg });
    Object.assign(tree, {
      isAgentOrgDeleting: () => false,
      isAgentOrgArchiving: () => false,
      isAgentOrgTerminating: () => false,
      agentOrgTerminationError: () => null,
      agentOrgContextFor: () => null,
    });
    if (!selected) {
      tree.toggleAgentOrgDefinition('ws', 'org-definition'); tree.toggleAgentOrgRun('org-run'); tree.toggleAgentOrgTeam('org-run', '/software');
    }
    avatars = useRunHistoryAvatarState({ loading: ref(false), agentDefinitions: computed(() => []), teamDefinitions: computed(() => []), orgDefinitions: computed(() => definitions.value) });
    return () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'ws', groups: [group], state: tree as unknown as WorkspaceHistorySectionState, actions, avatars });
  } }));
  return { wrapper, tree: tree!, avatars: avatars!, group, history, selectedOrg, draft, actions, definitions };
};

describe('Org disclosure through real tree and rendered hierarchy', () => {
  it.each([[true,true],[true,false],[false,true],[false,false]])('preserves selection and draft state through unified row disclosure active=%s selected=%s', async (active, selected) => {
    const {wrapper, tree, history, selectedOrg, draft, actions, group} = harness(active, selected);
    await nextTick();
    const selectedBefore = selectedOrg.value;
    const conversation = draft.conversation;
    const primary = wrapper.get('[data-test="agent-org-run-open-org-run"]');
    const chevron = primary.get('[data-test="agent-org-run-disclosure-org-run"]');
    const children = () => wrapper.get('[data-test="agent-org-run-children-org-run"]');
    expect(primary.element.tagName).toBe('BUTTON');
    expect(primary.attributes('type')).toBe('button');
    expect(primary.attributes('role')).toBe('treeitem');
    expect(primary.attributes('tabindex')).toBeUndefined();
    expect(chevron.element.closest('button')).toBe(primary.element);
    expect(chevron.attributes('tabindex')).toBeUndefined();
    expect(chevron.attributes('role')).toBeUndefined();
    expect(chevron.attributes('aria-expanded')).toBeUndefined();
    expect(chevron.attributes('aria-hidden')).toBe('true');
    expect(primary.attributes('aria-expanded')).toBe('true');
    expect(children().isVisible()).toBe(true);
    expect(wrapper.get('[data-test="agent-org-agent-row-implementation-run"]').attributes('aria-selected')).toBe(String(selected));
    await chevron.trigger('click');
    expect(primary.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-test="agent-org-run-children-org-run"]').exists()).toBe(false);
    expect(primary.attributes('aria-controls')).toBeUndefined();
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledExactlyOnceWith(group.runs[0]);
    history.navigationTopologyRevision++;
    group.runs[0] = { ...group.runs[0]!, summary: 'Refreshed history' };
    await nextTick();
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(false);
    expect(tree.isAgentOrgRunExpanded('sibling')).toBe(false);
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(true);
    expect(selectedOrg.value).toBe(selectedBefore);
    expect(draft.conversation).toBe(conversation);
    expect(draft.text).toBe('Unsaved work');
    for (const [name, action] of Object.entries(actions)) {
      if (name !== 'onOpenAgentOrgRun') expect(action).not.toHaveBeenCalled();
    }
    await primary.get('span.truncate').trigger('click');
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledTimes(2);
    expect(children().isVisible()).toBe(true);
    expect(wrapper.get('[data-test="agent-org-agent-row-implementation-run"]').isVisible()).toBe(true);
    wrapper.unmount();
  });

  it.each([true, false])('uses one primary path from summary and chevron while isolating Stop active=%s', async (active) => {
    const {wrapper, tree, selectedOrg, actions, group} = harness(active);
    const primary = wrapper.get('[data-test="agent-org-run-open-org-run"]');
    const chevron = primary.get('[data-test="agent-org-run-disclosure-org-run"]');
    const summary = primary.get('span.truncate');
    const toggle = vi.spyOn(tree, 'toggleAgentOrgRun');
    expect(wrapper.find('button[data-test="agent-org-run-disclosure-org-run"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-test="agent-org-run-open-org-run"]')).toHaveLength(1);
    expect(primary.element.tagName).toBe('BUTTON');
    expect(primary.attributes('type')).toBe('button');
    expect(primary.attributes('role')).toBe('treeitem');
    expect(primary.attributes('tabindex')).toBeUndefined();
    expect(chevron.element.closest('button')).toBe(primary.element);
    expect(chevron.attributes('tabindex')).toBeUndefined();
    expect(chevron.attributes('aria-label')).toBeUndefined();
    expect(chevron.attributes('aria-hidden')).toBe('true');
    await summary.trigger('click');
    expect(primary.attributes('aria-expanded')).toBe('false');
    expect(primary.attributes('aria-controls')).toBeUndefined();
    expect(toggle).toHaveBeenCalledExactlyOnceWith('org-run');
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledExactlyOnceWith(group.runs[0]);
    await chevron.trigger('click');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(primary.attributes('aria-expanded')).toBe('true');
    expect(primary.attributes('aria-controls')).toBe('org-hierarchy-ws-org-run');
    expect(toggle).toHaveBeenCalledTimes(2);
    expect(toggle).toHaveBeenLastCalledWith('org-run');
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledTimes(2);
    expect(actions.onOpenAgentOrgRun).toHaveBeenLastCalledWith(group.runs[0]);
    await primary.trigger('click');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(false);
    expect(primary.attributes('aria-expanded')).toBe('false');
    expect(primary.attributes('aria-controls')).toBeUndefined();
    expect(toggle).toHaveBeenCalledTimes(3);
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledTimes(3);
    expect(actions.onOpenAgentOrgRun).toHaveBeenLastCalledWith(group.runs[0]);
    if (active) {
      await wrapper.get('button[aria-label="Stop Agent Org"]').trigger('click');
      expect(actions.onTerminateAgentOrg).toHaveBeenCalledExactlyOnceWith(group.runs[0]);
      expect(tree.isAgentOrgRunExpanded('org-run')).toBe(false);
      expect(toggle).toHaveBeenCalledTimes(3);
      expect(actions.onOpenAgentOrgRun).toHaveBeenCalledTimes(3);
    } else expect(wrapper.find('button[aria-label="Stop Agent Org"]').exists()).toBe(false);
    await chevron.trigger('click');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(toggle).toHaveBeenCalledTimes(4);
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledTimes(4);
    await wrapper.get('[data-test="agent-org-team-row-mounted-team-run"]').trigger('click');
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(false);
    expect(actions.onSelectAgentOrgMember).toHaveBeenCalledWith(group.runs[0], '/software');
    await primary.trigger('click');
    selectedOrg.value = {...selectedOrg.value!, selection: {kind:'agent_execution', agentRunId:'new-task-run'}};
    await nextTick();
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(true);
    wrapper.unmount();
  });

  it("renders stopped-only accessible Archive/Delete controls and isolates their clicks from disclosure", async () => {
    const stopped = harness(false);
    const primary = stopped.wrapper.get('[data-test="agent-org-run-open-org-run"]');
    const archive = stopped.wrapper.get('[data-test="agent-org-run-archive-org-run"]');
    const remove = stopped.wrapper.get('[data-test="agent-org-run-delete-org-run"]');
    expect(archive.attributes('aria-label')).toBe('Archive Agent Org history');
    expect(remove.attributes('aria-label')).toBe('Delete Agent Org history permanently');
    expect(stopped.wrapper.find('button[aria-label="Stop Agent Org"]').exists()).toBe(false);
    const expanded = primary.attributes('aria-expanded');

    await archive.trigger('click');
    await remove.trigger('click');

    expect(stopped.actions.onArchiveAgentOrg).toHaveBeenCalledExactlyOnceWith(stopped.group.runs[0]);
    expect(stopped.actions.onDeleteAgentOrg).toHaveBeenCalledExactlyOnceWith(stopped.group.runs[0]);
    expect(stopped.actions.onOpenAgentOrgRun).not.toHaveBeenCalled();
    expect(primary.attributes('aria-expanded')).toBe(expanded);
    Object.assign(stopped.tree, { isAgentOrgDeleting: () => true });
    stopped.wrapper.vm.$forceUpdate();
    await nextTick();
    expect(stopped.wrapper.get('[data-test="agent-org-run-archive-org-run"]').attributes('disabled')).toBeDefined();
    expect(stopped.wrapper.get('[data-test="agent-org-run-delete-org-run"]').attributes('disabled')).toBeDefined();
    stopped.wrapper.unmount();

    const active = harness(true);
    expect(active.wrapper.find('[data-test="agent-org-run-archive-org-run"]').exists()).toBe(false);
    expect(active.wrapper.find('[data-test="agent-org-run-delete-org-run"]').exists()).toBe(false);
    expect(active.wrapper.get('button[aria-label="Stop Agent Org"]')).toBeTruthy();
    active.wrapper.unmount();
  });

  it('also collapses a selected root without changing selection', async () => {
    const {wrapper, selectedOrg, tree} = harness();
    selectedOrg.value = {rootRunId: 'org-run', focusAddress: null, selection: null};
    await nextTick();
    expect(tree.isAgentOrgRunSelected('org-run')).toBe(true);
    await wrapper.get('[data-test="agent-org-run-open-org-run"]').trigger('click');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(false);
    expect(tree.isAgentOrgRunSelected('org-run')).toBe(true);
    wrapper.unmount();
  });

  it('reactively renders Org avatars and isolates late old-URL failures', async () => {
    const {wrapper, definitions, avatars} = harness();
    const header = () => wrapper.get('[data-test="agent-org-definition-org-definition"]');
    expect(header().find('[data-icon="heroicons:building-office-2-20-solid"]').exists()).toBe(true);
    definitions.value = [{id:'org-definition', avatarUrl:' /old.png '}]; await nextTick();
    const oldImage = header().get('img');
    expect(oldImage.attributes('src')).toBe('/old.png');
    definitions.value = [{id:'org-definition', avatarUrl:'/new.png'}]; await nextTick();
    await oldImage.trigger('error');
    expect(avatars.showOrgAvatar('org-definition')).toBe(true);
    expect(header().get('img').attributes('src')).toBe('/new.png');
    await header().get('img').trigger('error');
    expect(header().find('img').exists()).toBe(false);
    expect(header().find('[data-icon="heroicons:building-office-2-20-solid"]').exists()).toBe(true);
    definitions.value = [{id:'org-definition', avatarUrl:' '}]; await nextTick();
    expect(header().find('img').exists()).toBe(false);
    wrapper.unmount();
  });
});
