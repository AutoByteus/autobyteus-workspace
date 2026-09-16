import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, nextTick, reactive, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceAgentOrgHistoryCollection from '../WorkspaceAgentOrgHistoryCollection.vue';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import { useRunHistoryAvatarState } from '~/composables/useRunHistoryAvatarState';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
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
  const actions = { onRemoveWorkspace: vi.fn(), onCreateRun: vi.fn(), onSelectRun: vi.fn(), onTerminateRun: vi.fn(), onArchiveRun: vi.fn(), onDeleteRun: vi.fn(), onTerminateTeam: vi.fn(), onArchiveTeam: vi.fn(), onDeleteTeam: vi.fn(), onSelectTeam: vi.fn(), onSelectTeamMember: vi.fn(), onOpenAgentOrgRun: vi.fn(), onSelectAgentOrgMember: vi.fn(), onInspectAgentOrgExecution: vi.fn(), onTerminateAgentOrg: vi.fn() };
  const definitions = ref<{id: string; avatarUrl?: string | null}[]>([]);
  let tree: ReturnType<typeof useWorkspaceHistoryTreeState>;
  let avatars: ReturnType<typeof useRunHistoryAvatarState>;
  const wrapper = mount(defineComponent({ setup() {
    tree = useWorkspaceHistoryTreeState({ runHistoryStore: history, selectionStore: {selectedType: null, selectedRunId: null}, selectedAgentOrg: selectedOrg });
    if (!selected) {
      tree.toggleAgentOrgDefinition('ws', 'org-definition'); tree.toggleAgentOrgRun('org-run'); tree.toggleAgentOrgTeam('org-run', '/software');
    }
    avatars = useRunHistoryAvatarState({ loading: ref(false), agentDefinitions: computed(() => []), teamDefinitions: computed(() => []), orgDefinitions: computed(() => definitions.value) });
    return () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'ws', groups: [group], state: tree as unknown as WorkspaceHistorySectionState, actions, avatars });
  } }));
  return { wrapper, tree: tree!, avatars: avatars!, group, history, selectedOrg, draft, actions, definitions };
};

describe('Org disclosure through real tree and rendered hierarchy', () => {
  it.each([[true,true],[true,false],[false,true],[false,false]])('isolates disclosure active=%s selected=%s across refresh', async (active, selected) => {
    const {wrapper, tree, history, selectedOrg, draft, actions, group} = harness(active, selected);
    await nextTick();
    const selectedBefore = selectedOrg.value;
    const conversation = draft.conversation;
    const disclosure = wrapper.get('[data-test="agent-org-run-disclosure-org-run"]');
    const children = () => wrapper.get('[data-test="agent-org-run-children-org-run"]');
    expect(disclosure.attributes('aria-expanded')).toBe('true');
    expect(children().isVisible()).toBe(true);
    expect(wrapper.get('[data-test="agent-org-agent-row-implementation-run"]').attributes('aria-selected')).toBe(String(selected));
    await disclosure.trigger('click');
    expect(disclosure.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-test="agent-org-run-children-org-run"]').exists()).toBe(false);
    expect(disclosure.attributes('aria-controls')).toBeUndefined();
    history.navigationTopologyRevision++;
    group.runs[0] = { ...group.runs[0]!, summary: 'Refreshed history' };
    await nextTick();
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(false);
    expect(tree.isAgentOrgRunExpanded('sibling')).toBe(false);
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(true);
    expect(selectedOrg.value).toBe(selectedBefore);
    expect(draft.conversation).toBe(conversation);
    expect(draft.text).toBe('Unsaved work');
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
    await disclosure.trigger('click');
    expect(children().isVisible()).toBe(true);
    expect(wrapper.get('[data-test="agent-org-agent-row-implementation-run"]').isVisible()).toBe(true);
    wrapper.unmount();
  });

  it.each([true, false])('keeps title, Stop, mounted Team and explicit selection reveal separate active=%s', async (active) => {
    const {wrapper, tree, selectedOrg, actions, group} = harness(active);
    const disclosure = wrapper.get('[data-test="agent-org-run-disclosure-org-run"]');
    await disclosure.trigger('click');
    await wrapper.get('[data-test="agent-org-run-open-org-run"]').trigger('click');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledExactlyOnceWith(group.runs[0]);
    await wrapper.get('[data-test="agent-org-run-open-org-run"]').trigger('click');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    if (active) {
      await wrapper.get('button[aria-label="Stop Agent Org"]').trigger('click');
      expect(actions.onTerminateAgentOrg).toHaveBeenCalledExactlyOnceWith(group.runs[0]);
    } else expect(wrapper.find('button[aria-label="Stop Agent Org"]').exists()).toBe(false);
    await wrapper.get('[data-test="agent-org-team-row-mounted-team-run"]').trigger('click');
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(false);
    expect(actions.onSelectAgentOrgMember).toHaveBeenCalledWith(group.runs[0], '/software');
    await disclosure.trigger('click');
    selectedOrg.value = {...selectedOrg.value!, selection: {kind:'agent_execution', agentRunId:'new-task-run'}};
    await nextTick();
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(true);
    await localizationRuntime.setPreference('zh-CN'); await nextTick();
    expect(disclosure.attributes('aria-label')).toContain('折叠');
    await localizationRuntime.setPreference('en');
    wrapper.unmount();
  });

  it('also collapses a selected root without changing selection', async () => {
    const {wrapper, selectedOrg, tree} = harness();
    selectedOrg.value = {rootRunId: 'org-run', focusAddress: null, selection: null};
    await nextTick();
    expect(tree.isAgentOrgRunSelected('org-run')).toBe(true);
    await wrapper.get('[data-test="agent-org-run-disclosure-org-run"]').trigger('click');
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
