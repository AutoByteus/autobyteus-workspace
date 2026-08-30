import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import WorkspaceHistoryWorkspaceSection from '../WorkspaceHistoryWorkspaceSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunHistoryTeamExecutionRows } from '~/stores/runHistoryTeamExecutionRows';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const stableAgent = (
  memberAddress: string,
  overrides: Partial<TeamMemberTreeRow> = {},
): TeamMemberTreeRow => ({
  teamRunId: 'team-run-1',
  kind: 'agent',
  memberAddress,
  displayName: memberAddress.split('/').filter(Boolean).at(-1) ?? memberAddress,
  agentRunId: `${memberAddress.replace(/[^a-z0-9]+/gi, '-')}-run`,
  workspaceRootPath: '/ws/a',
  summary: 'Team task summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: AgentStatus.Idle,
  isActive: true,
  deleteLifecycle: 'READY',
  children: [],
  ...overrides,
});

const rootRow = (children: TeamMemberTreeRow[], teamRunId = 'team-run-1'): TeamMemberTreeRow => ({
  teamRunId,
  kind: 'agent_team',
  memberAddress: '/',
  displayName: 'Team Alpha',
  teamDefinitionId: 'team-def-1',
  teamRunIdForNode: teamRunId,
  coordinatorAddress: children[0]?.memberAddress ?? '/worker',
  workspaceRootPath: '/ws/a',
  summary: 'Team task summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: null,
  isActive: true,
  deleteLifecycle: 'READY',
  children,
});

const mountSubject = (options: {
  stableChildren?: TeamMemberTreeRow[];
  liveContext?: ReturnType<typeof buildTestTeamContext>;
  workspaceTeams?: TeamTreeNode[];
  teamExpanded?: boolean;
  selectedTeamRunId?: string | null;
  selectedType?: 'agent' | 'team' | null;
} = {}) => {
  const worker = stableAgent('/worker', { agentRunId: 'worker-run' });
  const stableChildren = options.stableChildren ?? [worker];
  const liveContext = options.liveContext ?? buildTestTeamContext({
    teamRunId: 'team-run-1',
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    rootChildren: [testAgentNode('/worker', { agentRunId: worker.agentRunId!, displayName: 'worker' })],
    coordinatorAddress: '/worker',
    focusedAgentRunId: 'task-agent-run-1',
    workspaceRootPath: '/ws/a',
    tasks: [testTaskRecord({
      taskId: 'task_0001',
      delegatorAgentRunId: worker.agentRunId!,
      recipientAddress: '/worker',
      target: { agentRunId: 'task-agent-run-1' },
      description: 'Solve current task',
    })],
  });
  if (!options.liveContext) {
    liveContext.view.getAgentContext('task-agent-run-1')!.state.currentStatus = AgentStatus.Running;
  }
  const team: TeamTreeNode = {
    teamRunId: 'team-run-1',
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    workspaceRootPath: '/ws/a',
    summary: 'Team task summary',
    lastActivityAt: '2026-06-30T00:00:00.000Z',
    isActive: true,
    deleteLifecycle: 'READY',
    focusedAgentRunId: liveContext.view.getFocusedAgentRunId(),
    rootTeam: rootRow(stableChildren),
    members: stableChildren,
    executionRows: [],
  };
  team.executionRows = buildRunHistoryTeamExecutionRows(team, liveContext);

  const actions = {
    onRemoveWorkspace: vi.fn(), onCreateRun: vi.fn(), onSelectRun: vi.fn(),
    onTerminateRun: vi.fn(), onArchiveRun: vi.fn(), onDeleteRun: vi.fn(),
    onSelectTeam: vi.fn(), onTerminateTeam: vi.fn(), onArchiveTeam: vi.fn(),
    onDeleteTeam: vi.fn(), onSelectTeamMember: vi.fn(),
  };
  const expandedTeamMembers = reactive<Record<string, boolean>>({});
  const selectedTeamRunId = ref<string | null>(options.selectedTeamRunId ?? 'team-run-1');
  const selectedType = ref<'agent' | 'team' | null>(options.selectedType ?? 'team');
  const expansionKey = (workspaceId: string, teamRunId: string, rowKey: string) =>
    `${workspaceId}::${teamRunId}::${rowKey}`;
  const state = {
    selectedRunId: null,
    isTeamRunSelected: (teamRunId: string) => selectedType.value === 'team' && selectedTeamRunId.value === teamRunId,
    isRunTerminating: () => false, isTeamTerminating: () => false,
    isRunDeleting: () => false, isTeamDeleting: () => false,
    isRunArchiving: () => false, isTeamArchiving: () => false,
    isWorkspaceRemoving: () => false, isWorkspaceHistoryLoading: () => false,
    workspaceHistoryError: () => null, formatRelativeTime: () => 'now',
    isWorkspaceExpanded: () => true, toggleWorkspace: vi.fn(),
    isAgentExpanded: () => false, toggleAgent: vi.fn(),
    isTeamDefinitionExpanded: () => true, toggleTeamDefinition: vi.fn(),
    isTeamExpanded: () => options.teamExpanded ?? true,
    isTeamMemberExpanded: vi.fn((workspaceId: string, teamRunId: string, rowKey: string) =>
      Boolean(expandedTeamMembers[expansionKey(workspaceId, teamRunId, rowKey)])),
    toggleTeamMember: vi.fn((workspaceId: string, teamRunId: string, rowKey: string) => {
      const key = expansionKey(workspaceId, teamRunId, rowKey);
      expandedTeamMembers[key] = !expandedTeamMembers[key];
    }),
  };

  const wrapper = mount(WorkspaceHistoryWorkspaceSection, {
    props: {
      workspaceNode: {
        workspaceId: 'workspace:/ws/a', workspaceRootPath: '/ws/a', workspaceName: 'Workspace A',
        workspaceKind: 'filesystem', canRemoveFromWorkspaces: false, agents: [],
      },
      workspaceTeams: options.workspaceTeams ?? [team], workspaceTeamHistoryGroups: [], state,
      avatars: {
        showAgentAvatar: () => false, onAgentAvatarError: vi.fn(), getAgentInitials: () => 'A',
        showTeamAvatar: () => false, getTeamAvatarUrl: () => '', onTeamAvatarError: vi.fn(), getTeamInitials: () => 'TA',
        showTeamMemberAvatar: () => false, getTeamMemberAvatarUrl: () => '', onTeamMemberAvatarError: vi.fn(),
        getTeamMemberDisplayName: (member: any) => member.displayName, getTeamMemberInitials: () => 'W',
      },
      actions,
    },
    global: {
      stubs: { Icon: { template: '<span data-test="icon" />' } },
      mocks: { $t: (key: string) => ({
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title': 'Temporary task execution',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.active_team_runs': 'Active team runs',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.no_active_team_runs': 'No active team runs',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.active_team_run': 'Active team run',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.inactive_team_run': 'Inactive team run',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.nested_team_status_running': 'Team status: Running',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.nested_team_status_initializing': 'Team status: Initializing',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.nested_team_status_error': 'Team status: Error',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.nested_team_status_idle': 'Team status: Idle',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.nested_team_status_offline': 'Team status: Offline',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_team_history_permanently': 'Localized delete team history permanently',
      }[key] ?? key) },
    },
  });

  return { wrapper, actions, state, liveContext, worker, team, selectedTeamRunId, selectedType };
};

describe('WorkspaceHistoryWorkspaceSection current execution rows', () => {
  it('renders any-active definition activity and exact sibling run activity reactively', async () => {
    const activeRun: TeamTreeNode = {
      teamRunId: 'team-run-active', teamDefinitionId: 'team-def-1', teamDefinitionName: 'Team Alpha',
      workspaceRootPath: '/ws/a', summary: 'Active task', lastActivityAt: '2026-06-29T00:00:00.000Z',
      isActive: true, deleteLifecycle: 'READY', focusedAgentRunId: '', rootTeam: rootRow([], 'team-run-active'),
      members: [], executionRows: [],
    };
    const inactiveRun: TeamTreeNode = {
      ...activeRun, teamRunId: 'team-run-inactive', rootTeam: rootRow([], 'team-run-inactive'),
      summary: 'Inactive task', lastActivityAt: '2026-06-30T00:00:00.000Z', isActive: false,
    };
    const { wrapper } = mountSubject({ workspaceTeams: [activeRun, inactiveRun], teamExpanded: false });
    const groupRow = wrapper.get('[data-test="workspace-team-definition-row-team-def-1"]');
    expect(groupRow.get('[data-test="team-activity-dot"]').attributes()).toMatchObject({
      'data-active': 'true', 'aria-label': 'Active team runs', title: 'Active team runs',
    });
    expect(wrapper.get('[data-test="workspace-team-row-team-run-active"] [data-test="team-activity-dot"]').attributes('data-active')).toBe('true');
    expect(wrapper.get('[data-test="workspace-team-row-team-run-inactive"] [data-test="team-activity-dot"]').attributes('data-active')).toBe('false');
    await wrapper.setProps({ workspaceTeams: [{ ...activeRun, isActive: false }, inactiveRun] });
    await wrapper.vm.$nextTick();
    expect(groupRow.get('[data-test="team-activity-dot"]').attributes('data-active')).toBe('false');
  });

  it('renders mutually exclusive active Stop and inactive Archive/Delete actions', async () => {
    const active = mountSubject();
    expect(active.wrapper.find('button[title$="terminate_team"]').exists()).toBe(true);
    expect(active.wrapper.find('button[aria-label="Localized delete team history permanently"]').exists()).toBe(false);
    expect(active.wrapper.find('button[title$="archive_team_history"]').exists()).toBe(false);
    active.wrapper.unmount();

    const inactiveTeam = {
      ...active.team,
      isActive: false,
      rootTeam: { ...active.team.rootTeam, isActive: false },
    };
    const inactive = mountSubject({ workspaceTeams: [inactiveTeam] });
    expect(inactive.wrapper.find('button[title$="terminate_team"]').exists()).toBe(false);
    expect(inactive.wrapper.find('button[title$="archive_team_history"]').exists()).toBe(true);
    const deleteButton = inactive.wrapper.get('button[aria-label="Localized delete team history permanently"]');
    expect(deleteButton.attributes('title')).toBe('Localized delete team history permanently');
  });

  it('renders and selects exact stable and task-Agent execution identities', async () => {
    const { wrapper, actions, state } = mountSubject();
    const stableRow = wrapper.get('[data-row-kind="stable_member"]');
    expect(stableRow.text()).toContain('worker');
    await stableRow.trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/worker', agentRunId: 'worker-run',
    }, 'workspace:/ws/a');
    expect(state.toggleTeamMember).toHaveBeenCalledWith(
      'workspace:/ws/a', 'team-run-1', 'agent:worker-run',
    );

    actions.onSelectTeamMember.mockClear();
    const taskRow = wrapper.get('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRow.attributes('data-transient-kind')).toBe('task_agent');
    expect(taskRow.attributes('data-member-address')).toBe('/worker');
    expect(taskRow.classes()).toContain('is-selected');
    expect(taskRow.attributes()).toMatchObject({
      role: 'treeitem',
      'aria-level': '2',
      'aria-selected': 'true',
      title: 'Temporary task agent · Task: Solve current task · /worker',
    });
    await taskRow.trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/worker', agentRunId: 'task-agent-run-1',
    }, 'workspace:/ws/a');
  });

  it('marks only the selected TeamRun current when member addresses repeat', async () => {
    const buildTeam = (teamRunId: string, agentRunId: string): TeamTreeNode => {
      const member = stableAgent('/worker', { teamRunId, agentRunId });
      return {
        teamRunId, teamDefinitionId: 'team-def-1', teamDefinitionName: 'Team Alpha', workspaceRootPath: '/ws/a',
        summary: 'Team task summary', lastActivityAt: '2026-06-30T00:00:00.000Z', isActive: true,
        deleteLifecycle: 'READY', focusedAgentRunId: agentRunId, rootTeam: rootRow([member], teamRunId), members: [member],
        executionRows: [{
          kind: 'stable_member', rowKey: `agent:${agentRunId}`, teamRunId, memberAddress: '/worker', agentRunId,
          teamRunIdForNode: null, memberKind: 'agent', displayName: 'worker', depth: 0, hasChildren: false, row: member,
        }],
      };
    };
    const { wrapper, selectedTeamRunId, selectedType } = mountSubject({
      workspaceTeams: [buildTeam('team-run-1', 'worker-run-1'), buildTeam('team-run-2', 'worker-run-2')],
      selectedTeamRunId: 'team-run-2',
    });
    const teamARow = () => wrapper.get('[data-test="workspace-team-member-team-run-1-/worker"]');
    const teamBRow = () => wrapper.get('[data-test="workspace-team-member-team-run-2-/worker"]');
    expect(teamARow().attributes('aria-current')).toBeUndefined();
    expect(teamBRow().attributes('aria-current')).toBe('true');
    selectedTeamRunId.value = null;
    await wrapper.vm.$nextTick();
    expect(teamBRow().attributes('aria-current')).toBeUndefined();
    selectedTeamRunId.value = 'team-run-1'; selectedType.value = 'agent';
    await wrapper.vm.$nextTick();
    expect(teamARow().attributes('aria-current')).toBeUndefined();
  });

  it('toggles a task-Team subtree and selects only its concrete task Agent child', async () => {
    const worker = stableAgent('/worker', { agentRunId: 'worker-run' });
    const stableReviewer = stableAgent('/study_group/reviewer', { displayName: 'reviewer', agentRunId: 'reviewer-run' });
    const stableStudyGroup: TeamMemberTreeRow = {
      ...stableAgent('/study_group', { displayName: 'Study Group' }), kind: 'agent_team', agentRunId: null,
      teamDefinitionId: 'study-group-definition', teamRunIdForNode: 'study-group-run',
      coordinatorAddress: '/study_group/reviewer', currentStatus: null, children: [stableReviewer],
    };
    const liveContext = buildTestTeamContext({
      teamRunId: 'team-run-1',
      rootChildren: [
        testAgentNode('/worker', { agentRunId: 'worker-run' }),
        testSubTeamNode('/study_group', [testAgentNode('/study_group/reviewer', { agentRunId: 'reviewer-run' })], {
          teamRunId: 'study-group-run',
        }),
      ],
      coordinatorAddress: '/worker', focusedAgentRunId: 'worker-run',
      tasks: [testTaskRecord({
        taskId: 'task_0002', delegatorAgentRunId: 'worker-run', recipientAddress: '/study_group',
        target: { teamRunId: 'task-team-run-1' }, description: 'Review design',
        referenceFiles: ['/tmp/design-spec.md'],
      })],
    });
    const taskChildRunId = 'task-team-run-1:reviewer-run';
    liveContext.view.getAgentContext(taskChildRunId)!.state.currentStatus = AgentStatus.Running;
    const { wrapper, actions } = mountSubject({ stableChildren: [worker, stableStudyGroup], liveContext });

    await wrapper.get('[data-test="workspace-team-member-team-run-1-/study_group"]').trigger('click');
    await wrapper.vm.$nextTick();
    let taskRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0].attributes('data-transient-kind')).toBe('task_team');
    await taskRows[0].trigger('click');
    await wrapper.vm.$nextTick();
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();
    taskRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRows).toHaveLength(2);
    expect(taskRows[1].attributes('data-transient-kind')).toBe('task_team_child');
    await taskRows[1].trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/study_group/reviewer', agentRunId: taskChildRunId,
    }, 'workspace:/ws/a');
    expect(wrapper.text()).toContain('Task: Review design');
    expect(wrapper.text()).not.toContain('/tmp/design-spec.md');
  });

  it('removes transient execution rows when the exact live projection disappears', async () => {
    const { wrapper, team, worker } = mountSubject();
    await wrapper.get('[data-row-kind="stable_member"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(true);
    await wrapper.setProps({ workspaceTeams: [{
      ...team, focusedAgentRunId: worker.agentRunId!, rootTeam: rootRow([worker]), members: [worker],
      executionRows: buildRunHistoryTeamExecutionRows({ ...team, focusedAgentRunId: worker.agentRunId!, rootTeam: rootRow([worker]), members: [worker] }),
    }] });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-row-kind="stable_member"]').exists()).toBe(true);
  });

  it('toggles stable nested Team children by exact row key and selects the concrete child Agent', async () => {
    const reviewLead = stableAgent('/software_team/review_lead', { displayName: 'review_lead', agentRunId: 'review-lead-run' });
    const structuralTeam: TeamMemberTreeRow = {
      ...stableAgent('/software_team', { displayName: 'Software Engineering Team' }), kind: 'agent_team', agentRunId: null,
      teamDefinitionId: 'software-team', teamRunIdForNode: 'software-team-run', coordinatorAddress: '/software_team/review_lead',
      currentStatus: null, children: [reviewLead],
    };
    const liveContext = buildTestTeamContext({
      teamRunId: 'team-run-1',
      rootChildren: [testSubTeamNode('/software_team', [testAgentNode('/software_team/review_lead', { agentRunId: 'review-lead-run' })], {
        teamRunId: 'software-team-run',
      })],
      coordinatorAddress: '/software_team/review_lead', focusedAgentRunId: 'review-lead-run',
    });
    const { wrapper, actions, state } = mountSubject({ stableChildren: [structuralTeam], liveContext });
    const nestedRow = () => wrapper.get('[data-test="workspace-team-member-team-run-1-/software_team"]');
    const childRow = () => wrapper.find('[data-test="workspace-team-member-team-run-1-/software_team/review_lead"]');
    expect(childRow().exists()).toBe(false);
    await nestedRow().trigger('click');
    await wrapper.vm.$nextTick();
    expect(state.toggleTeamMember).toHaveBeenLastCalledWith('workspace:/ws/a', 'team-run-1', 'team:software-team-run');
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();
    expect(childRow().exists()).toBe(true);
    await childRow().trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/software_team/review_lead', agentRunId: 'review-lead-run',
    }, 'workspace:/ws/a');
  });

  it('keeps a localized nested-Team aggregate visible, reactive, aligned, and non-interactive while collapsed', async () => {
    const prototyper = stableAgent('/product_team/product_prototyper', {
      displayName: 'product_prototyper', agentRunId: 'product-prototyper-run',
      currentStatus: AgentStatus.Running,
    });
    const bootstrapper = stableAgent('/product_team/prototype_bootstrapper', {
      displayName: 'prototype_bootstrapper', agentRunId: 'prototype-bootstrapper-run',
      currentStatus: AgentStatus.Idle,
    });
    const productTeam: TeamMemberTreeRow = {
      ...stableAgent('/product_team', { displayName: 'Product Design & Prototyping Team' }),
      kind: 'agent_team', agentRunId: null, teamDefinitionId: 'product-team',
      teamRunIdForNode: 'product-team-run', coordinatorAddress: prototyper.memberAddress,
      currentStatus: null, children: [prototyper, bootstrapper],
    };
    const liveContext = buildTestTeamContext({
      teamRunId: 'team-run-1',
      rootChildren: [testSubTeamNode('/product_team', [
        testAgentNode(prototyper.memberAddress, { agentRunId: prototyper.agentRunId! }),
        testAgentNode(bootstrapper.memberAddress, { agentRunId: bootstrapper.agentRunId! }),
      ], { teamRunId: 'product-team-run', coordinatorAddress: prototyper.memberAddress })],
      coordinatorAddress: prototyper.memberAddress,
      focusedAgentRunId: prototyper.agentRunId!,
    });
    liveContext.view.getAgentContext(prototyper.agentRunId!)!.state.currentStatus = AgentStatus.Running;
    liveContext.view.getAgentContext(bootstrapper.agentRunId!)!.state.currentStatus = AgentStatus.Idle;

    const { wrapper, state, actions, team } = mountSubject({
      stableChildren: [productTeam], liveContext,
    });
    const nestedRow = wrapper.get('[data-test="workspace-team-member-team-run-1-/product_team"]');
    expect(wrapper.find('[data-test="workspace-team-member-team-run-1-/product_team/product_prototyper"]').exists()).toBe(false);
    expect(nestedRow.findAll('[data-test="nested-team-aggregate-status-dot"]')).toHaveLength(1);
    let dot = nestedRow.get('[data-test="nested-team-aggregate-status-dot"]');
    expect(dot.attributes()).toMatchObject({
      'data-status': AgentStatus.Running,
      'aria-label': 'Team status: Running',
      title: 'Team status: Running',
      role: 'img',
    });
    expect(dot.get('[aria-hidden="true"]').classes()).toEqual(expect.arrayContaining([
      'h-2', 'w-2', 'bg-blue-500', 'animate-pulse',
    ]));
    expect(dot.attributes('tabindex')).toBeUndefined();
    expect(dot.element.parentElement?.nextElementSibling?.classList.contains('h-4')).toBe(true);
    expect(nestedRow.get('[data-test="workspace-team-member-disclosure"]').element.compareDocumentPosition(dot.element))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const idleRows = team.executionRows.map((row) => {
      if (row.memberKind !== 'agent') return row;
      return row.kind === 'stable_member'
        ? { ...row, row: { ...row.row, currentStatus: AgentStatus.Idle } }
        : { ...row, currentStatus: AgentStatus.Idle };
    });
    await wrapper.setProps({ workspaceTeams: [{ ...team, executionRows: idleRows }] });
    await wrapper.vm.$nextTick();
    dot = nestedRow.get('[data-test="nested-team-aggregate-status-dot"]');
    expect(dot.attributes()).toMatchObject({
      'data-status': AgentStatus.Idle,
      'aria-label': 'Team status: Idle',
      title: 'Team status: Idle',
    });
    expect(dot.get('[aria-hidden="true"]').classes()).toContain('bg-green-500');
    expect(dot.get('[aria-hidden="true"]').classes()).not.toContain('animate-pulse');

    expect(state.toggleTeamMember).not.toHaveBeenCalled();
    await dot.trigger('click');
    expect(state.toggleTeamMember).toHaveBeenCalledTimes(1);
    expect(state.toggleTeamMember).toHaveBeenCalledWith(
      'workspace:/ws/a', 'team-run-1', 'team:product-team-run',
    );
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();
  });

  it('renders accessible printed-tree rails, node identities, and orthogonal selection', async () => {
    const nestedAgent = stableAgent('/design/researcher', {
      displayName: 'Research Operations Specialist',
      agentRunId: 'researcher-run',
    });
    const designTeam: TeamMemberTreeRow = {
      ...stableAgent('/design', { displayName: 'Product Design & Prototyping' }),
      kind: 'agent_team', agentRunId: null, teamDefinitionId: 'design-team',
      teamRunIdForNode: 'design-team-run', coordinatorAddress: nestedAgent.memberAddress,
      currentStatus: null, children: [nestedAgent],
    };
    const coordinator = stableAgent('/coordinator', {
      displayName: 'Workspace Program Coordinator',
      agentRunId: 'coordinator-run',
    });
    const liveContext = buildTestTeamContext({
      teamRunId: 'team-run-1',
      rootChildren: [
        testSubTeamNode('/design', [
          testAgentNode(nestedAgent.memberAddress, { agentRunId: nestedAgent.agentRunId! }),
        ], {
          teamRunId: 'design-team-run',
          coordinatorAddress: nestedAgent.memberAddress,
          displayName: 'Product Design & Prototyping',
        }),
        testAgentNode(coordinator.memberAddress, { agentRunId: coordinator.agentRunId! }),
      ],
      coordinatorAddress: coordinator.memberAddress,
      focusedAgentRunId: coordinator.agentRunId!,
    });
    const { wrapper } = mountSubject({
      stableChildren: [designTeam, coordinator],
      liveContext,
    });

    const tree = wrapper.get('[data-test="workspace-team-execution-tree"]');
    expect(tree.attributes('role')).toBe('tree');
    expect(tree.attributes('aria-label')).toContain('organization tree');

    const designRow = wrapper.get('[data-test="workspace-team-member-team-run-1-/design"]');
    expect(designRow.attributes()).toMatchObject({
      role: 'treeitem',
      'aria-level': '1',
      'aria-expanded': 'false',
      'aria-selected': 'false',
      title: 'Agent team · design · /design',
    });
    expect(designRow.classes()).toContain('font-semibold');
    expect(designRow.find('[data-team-icon="user-group-solid"]').exists()).toBe(true);
    expect(designRow.get('[data-test="workspace-team-member-disclosure"]').attributes('aria-label'))
      .toBe('Expand design');
    expect(designRow.get('[data-test="workspace-hierarchy-branches"] [data-has-following-sibling]').attributes('data-has-following-sibling'))
      .toBe('true');

    const selectedCoordinator = wrapper.get('[data-test="workspace-team-member-team-run-1-/coordinator"]');
    expect(selectedCoordinator.classes()).toContain('is-selected');
    expect(selectedCoordinator.attributes()).toMatchObject({
      'aria-selected': 'true',
      'aria-current': 'true',
    });

    await designRow.trigger('keydown', { key: 'Enter' });
    await wrapper.vm.$nextTick();
    const nestedAgentRow = wrapper.get('[data-test="workspace-team-member-team-run-1-/design/researcher"]');
    expect(nestedAgentRow.attributes('aria-level')).toBe('2');
    expect(nestedAgentRow.find('[data-test="workspace-team-member-avatar"]').exists()).toBe(true);
    expect(nestedAgentRow.find('[data-test="workspace-hierarchy-branches"] [data-ancestor-depth="0"]').exists()).toBe(true);
    expect(nestedAgentRow.get('[data-test="workspace-hierarchy-branches"] [data-has-following-sibling]').attributes('data-has-following-sibling'))
      .toBe('false');
  });
});
