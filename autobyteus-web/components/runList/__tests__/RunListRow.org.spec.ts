import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, nextTick, reactive, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import RunListRow from '../RunListRow.vue';
import { useRunListDisclosure } from '~/composables/useRunListDisclosure';
import { useRunHistoryAvatarState } from '~/composables/useRunHistoryAvatarState';
import type { OrgWorkspaceSelection } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex';
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes';
import type { RunListEntry } from '~/utils/runListProjection';
import type { RunListSectionState } from '~/components/runList/runListSectionContracts';
vi.mock('@iconify/vue', () => ({ Icon: {props: ['icon'], template: '<span :data-icon="icon" />'} }));

const agentOrgRun = (): AgentOrgRunHistoryItem => {
  const launch = {
    runtimeKind: 'codex_app_server' as const,
    llmModelIdentifier: 'gpt-5.6-sol',
    llmConfig: null,
    autoExecuteTools: false,
    workspaceRootPath: '/ws/a',
  };
  return {
      stableKey: 'agent_org_run:org-run',
      rootSubjectKind: 'agent_org',
      rootRunId: 'org-run',
      createdAt: '2026-09-03T00:00:00.000Z', lastActivityAt: '2026-09-03T00:00:00.000Z',
      archivedAt: null,
      isActive: true,
      summary: 'Deliver current package',
      closedTaskExecutions: [],
      executionTree: {
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
  };
};

const orgEntry = (run: AgentOrgRunHistoryItem): RunListEntry => ({
  kind: 'org', key: `org:${run.rootRunId}`, runId: run.rootRunId, name: 'Delivery Org', lastActivityAt: run.createdAt,
  isActive: run.isActive, folderRootPath: '/ws/a', definitionId: 'org-definition', orgRun: run,
});

const harness = (active = true, selected = true) => {
  const run = reactive(agentOrgRun());
  run.isActive = active;
  const runList = reactive({ entries: [] as RunListEntry[], showRun: vi.fn() });
  runList.entries = [orgEntry(run)];
  const selectedOrg = ref<{rootRunId: string; focusAddress: string | null; selection: OrgWorkspaceSelection | null} | null>(selected ? { rootRunId: 'org-run', focusAddress: '/software/implementation',
    selection: { kind: 'agent_execution' as const, agentRunId: 'implementation-run' } } : null);
  const draft = reactive({ text: 'Unsaved work', conversation: [{ text: 'Existing message' }] });
  const history = reactive({ selectedRunId: null, selectedTeamRunId: null, navigationTopologyRevision: 0, getTeamMemberNavigationAncestorRowKeys: () => [] });
  const actions = { onSelectRun: vi.fn(), onTerminateRun: vi.fn(), onArchiveRun: vi.fn(), onDeleteRun: vi.fn(), onTerminateTeam: vi.fn(), onArchiveTeam: vi.fn(), onDeleteTeam: vi.fn(), onSelectTeam: vi.fn(), onOpenTeamRun: vi.fn(), onSelectTeamMember: vi.fn(), onOpenAgentOrgRun: vi.fn(), onSelectAgentOrgMember: vi.fn(), onInspectAgentOrgExecution: vi.fn(), onTerminateAgentOrg: vi.fn(), onArchiveAgentOrg: vi.fn(), onDeleteAgentOrg: vi.fn() };
  const definitions = ref<{id: string; avatarUrl?: string | null}[]>([]);
  const deleting = ref(false);
  let tree: ReturnType<typeof useRunListDisclosure>;
  let avatars: ReturnType<typeof useRunHistoryAvatarState>;
  const wrapper = mount(defineComponent({ setup() {
    tree = useRunListDisclosure({ runHistoryStore: history, runListStore: runList, selectionStore: {selectedType: null, selectedRunId: null}, selectedAgentOrg: selectedOrg });
    if (!selected) { tree.toggleAgentOrgRun('org-run'); tree.toggleAgentOrgTeam('org-run', '/software'); }
    avatars = useRunHistoryAvatarState({ loading: ref(false), agentDefinitions: computed(() => []), teamDefinitions: computed(() => []), orgDefinitions: computed(() => definitions.value) });
    const state = { ...tree, isAgentOrgDeleting: () => deleting.value, isAgentOrgArchiving: () => false, isAgentOrgTerminating: () => false,
      agentOrgTerminationError: () => null, agentOrgContextFor: () => null } as unknown as RunListSectionState;
    return () => h(RunListRow, { entry: runList.entries[0]!, state, actions, avatars, folderLabel: 'a', relative: () => '3d' });
  } }));
  return { wrapper, tree: tree!, avatars: avatars!, run, runList, history, selectedOrg, draft, actions, definitions, deleting };
};

describe('an Org run row in "Your runs" (UIT-003)', () => {
  it.each([[true,true],[true,false],[false,true],[false,false]])('opens with its members and keeps selection, draft and disclosure across a refresh active=%s selected=%s', async (active, selected) => {
    const {wrapper, tree, history, run, runList, selectedOrg, draft, actions} = harness(active, selected);
    await nextTick();
    const selectedBefore = selectedOrg.value;
    const conversation = draft.conversation;
    const primary = wrapper.get('[data-test="agent-org-run-open-org-run"]');
    const children = () => wrapper.find('[data-test="agent-org-run-children-org-run"]');
    expect(primary.element.tagName).toBe('BUTTON');
    expect(primary.attributes('type')).toBe('button');
    // The chevron is decoration in its own cell; the row's one control is the main button.
    const chevron = wrapper.get('[data-test="run-list-row-chevron"]');
    expect(chevron.element.closest('button')).toBeNull();
    expect(primary.attributes('aria-expanded')).toBe('true');
    expect(primary.attributes('aria-controls')).toBe('run-list-org-org-run');
    expect(children().exists()).toBe(true);
    expect(wrapper.get('[data-test="agent-org-agent-row-implementation-run"]').attributes('aria-selected')).toBe(String(selected));

    // Opening an open Org run keeps its members open (it never collapses them).
    await primary.trigger('click');
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledExactlyOnceWith(run);
    expect(primary.attributes('aria-expanded')).toBe('true');

    history.navigationTopologyRevision++;
    runList.entries = [orgEntry({ ...run, summary: 'Refreshed history' })];
    await nextTick();
    expect(wrapper.text()).toContain('Refreshed history');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(true);
    expect(selectedOrg.value).toBe(selectedBefore);
    expect(draft.conversation).toBe(conversation);
    expect(draft.text).toBe('Unsaved work');
    for (const [name, action] of Object.entries(actions)) {
      if (name !== 'onOpenAgentOrgRun') expect(action).not.toHaveBeenCalled();
    }
    wrapper.unmount();
  });

  it.each([true, false])('opens a folded Org run, isolates Stop, toggles a Team member, and reveals a newly selected execution active=%s', async (active) => {
    const {wrapper, tree, selectedOrg, actions, run} = harness(active, false);
    tree.toggleAgentOrgRun('org-run');
    await nextTick();
    const primary = wrapper.get('[data-test="agent-org-run-open-org-run"]');
    expect(primary.attributes('aria-expanded')).toBe('false');
    expect(primary.attributes('aria-controls')).toBeUndefined();
    await primary.get('[data-test="run-list-row-name"]').trigger('click');
    expect(primary.attributes('aria-expanded')).toBe('true');
    expect(actions.onOpenAgentOrgRun).toHaveBeenCalledExactlyOnceWith(run);
    if (active) {
      await wrapper.get('button[aria-label="Stop Agent Org"]').trigger('click');
      expect(actions.onTerminateAgentOrg).toHaveBeenCalledExactlyOnceWith(run);
      expect(actions.onOpenAgentOrgRun).toHaveBeenCalledTimes(1);
    } else expect(wrapper.find('button[aria-label="Stop Agent Org"]').exists()).toBe(false);
    await wrapper.get('[data-test="agent-org-team-row-mounted-team-run"]').trigger('click');
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(false);
    expect(actions.onSelectAgentOrgMember).toHaveBeenCalledWith(run, '/software');
    tree.toggleAgentOrgRun('org-run');
    selectedOrg.value = { rootRunId: 'org-run', focusAddress: '/software/implementation', selection: {kind:'agent_execution', agentRunId:'new-task-run'} };
    await nextTick();
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(tree.isAgentOrgTeamExpanded('org-run', '/software')).toBe(true);
    wrapper.unmount();
  });

  it('offers Archive and Delete only on a stopped Org run, isolated from opening, disabled while one is pending', async () => {
    const stopped = harness(false);
    const archive = stopped.wrapper.get('[data-test="run-list-archive"]');
    const remove = stopped.wrapper.get('[data-test="run-list-delete"]');
    expect(archive.attributes('aria-label')).toBe('Archive Agent Org history');
    expect(remove.attributes('aria-label')).toBe('Delete Agent Org history permanently');
    expect(stopped.wrapper.find('button[aria-label="Stop Agent Org"]').exists()).toBe(false);

    await archive.trigger('click');
    await remove.trigger('click');
    expect(stopped.actions.onArchiveAgentOrg).toHaveBeenCalledExactlyOnceWith(stopped.run);
    expect(stopped.actions.onDeleteAgentOrg).toHaveBeenCalledExactlyOnceWith(stopped.run);
    expect(stopped.actions.onOpenAgentOrgRun).not.toHaveBeenCalled();
    stopped.deleting.value = true;
    await nextTick();
    expect(stopped.wrapper.get('[data-test="run-list-archive"]').attributes('disabled')).toBeDefined();
    expect(stopped.wrapper.get('[data-test="run-list-delete"]').attributes('disabled')).toBeDefined();
    stopped.wrapper.unmount();

    const active = harness(true);
    expect(active.wrapper.find('[data-test="run-list-archive"]').exists()).toBe(false);
    expect(active.wrapper.find('[data-test="run-list-delete"]').exists()).toBe(false);
    expect(active.wrapper.get('button[aria-label="Stop Agent Org"]')).toBeTruthy();
    active.wrapper.unmount();
  });

  it('marks the open Org run and keeps it marked when opened again', async () => {
    const {wrapper, selectedOrg, tree} = harness();
    selectedOrg.value = {rootRunId: 'org-run', focusAddress: null, selection: null};
    await nextTick();
    const primary = wrapper.get('[data-test="agent-org-run-open-org-run"]');
    expect(primary.attributes('aria-current')).toBe('true');
    await primary.trigger('click');
    expect(tree.isAgentOrgRunExpanded('org-run')).toBe(true);
    expect(tree.isAgentOrgRunSelected('org-run')).toBe(true);
    wrapper.unmount();
  });

  it('reactively renders the Org avatar and isolates late old-URL failures', async () => {
    const {wrapper, definitions, avatars} = harness();
    const row = () => wrapper.get('[data-test="agent-org-run-open-org-run"]');
    expect(row().find('[data-icon="heroicons:building-office-2-20-solid"]').exists()).toBe(true);
    definitions.value = [{id:'org-definition', avatarUrl:' /old.png '}]; await nextTick();
    const oldImage = row().get('img');
    expect(oldImage.attributes('src')).toBe('/old.png');
    definitions.value = [{id:'org-definition', avatarUrl:'/new.png'}]; await nextTick();
    await oldImage.trigger('error');
    expect(avatars.showOrgAvatar('org-definition')).toBe(true);
    expect(row().get('img').attributes('src')).toBe('/new.png');
    await row().get('img').trigger('error');
    expect(row().find('img').exists()).toBe(false);
    expect(row().find('[data-icon="heroicons:building-office-2-20-solid"]').exists()).toBe(true);
    definitions.value = [{id:'org-definition', avatarUrl:' '}]; await nextTick();
    expect(row().find('img').exists()).toBe(false);
    wrapper.unmount();
  });
});
