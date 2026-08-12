import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import WorkspaceHistoryWorkspaceSection from '../WorkspaceHistoryWorkspaceSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunHistoryTeamExecutionRows } from '~/stores/runHistoryTeamExecutionRows';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import {
  createTeamExecutionAddress,
  toTeamExecutionAddressDto,
} from '~/types/agent/TeamExecutionAddress';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
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

const rootRow = (children: TeamMemberTreeRow[]): TeamMemberTreeRow => ({
  teamRunId: 'team-run-1',
  kind: 'agent_team',
  memberAddress: '/',
  displayName: 'Team Alpha',
  teamDefinitionId: 'team-def-1',
  teamRunIdForNode: 'team-run-1',
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
  workspaceTeams?: any[];
  teamExpanded?: boolean;
  canTerminateTeam?: (isActive: boolean) => boolean;
  selectedTeamRunId?: string | null;
  selectedType?: 'agent' | 'team' | null;
} = {}) => {
  const worker = stableAgent('/worker');
  const stableChildren = options.stableChildren ?? [worker];
  const defaultTaskAddress = createTeamExecutionAddress({
    rootTeamRunId: 'team-run-1',
    memberAddress: '/worker',
    taskAgentRunId: 'task-agent-run-1',
  });
  const liveContext = options.liveContext ?? buildTestTeamContext({
    teamRunId: 'team-run-1',
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    rootChildren: [testAgentNode('/worker', { agentRunId: worker.agentRunId!, displayName: 'worker' })],
    coordinatorAddress: '/worker',
    focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-1', memberAddress: '/worker' }),
    workspaceRootPath: '/ws/a',
    tasks: [testTaskProjection({
      taskId: 'task_0001',
      executionAddress: defaultTaskAddress,
      senderAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-1', memberAddress: '/worker' }),
    })],
  });
  const defaultTaskContext = liveContext.executions.getAgentContext(defaultTaskAddress);
  if (defaultTaskContext) {
    defaultTaskContext.state.currentStatus = AgentStatus.Running;
    liveContext.executions.focus(defaultTaskAddress);
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
    focusedExecutionAddress: liveContext.executions.getFocusedAddress(),
    rootTeam: rootRow(stableChildren),
    members: stableChildren,
    executionRows: [],
  };
  team.executionRows = buildRunHistoryTeamExecutionRows(team, liveContext);

  const actions = {
    onRemoveWorkspace: vi.fn(),
    onCreateRun: vi.fn(),
    onSelectRun: vi.fn(),
    onTerminateRun: vi.fn(),
    onArchiveRun: vi.fn(),
    onDeleteRun: vi.fn(),
    onSelectTeam: vi.fn(),
    onTerminateTeam: vi.fn(),
    onArchiveTeam: vi.fn(),
    onDeleteTeam: vi.fn(),
    onSelectTeamMember: vi.fn(),
  };
  const expandedTeamMembers = reactive<Record<string, boolean>>({});
  const selectedTeamRunId = ref<string | null>(options.selectedTeamRunId ?? 'team-run-1');
  const selectedType = ref<'agent' | 'team' | null>(options.selectedType ?? 'team');
  const expansionKey = (workspaceId: string, teamRunId: string, selector: string) =>
    `${workspaceId}::${teamRunId}::${selector}`;
  const state = {
    selectedRunId: null,
    isTeamRunSelected: (teamRunId: string) =>
      selectedType.value === 'team' && selectedTeamRunId.value === teamRunId,
    isRunTerminating: () => false,
    isTeamTerminating: () => false,
    isRunDeleting: () => false,
    isTeamDeleting: () => false,
    isRunArchiving: () => false,
    isTeamArchiving: () => false,
    isWorkspaceRemoving: () => false,
    isWorkspaceHistoryLoading: () => false,
    workspaceHistoryError: () => null,
    formatRelativeTime: () => 'now',
    isWorkspaceExpanded: () => true,
    toggleWorkspace: vi.fn(),
    isAgentExpanded: () => false,
    toggleAgent: vi.fn(),
    isTeamDefinitionExpanded: () => true,
    toggleTeamDefinition: vi.fn(),
    isTeamExpanded: () => options.teamExpanded ?? true,
    isTeamMemberExpanded: vi.fn((workspaceId: string, teamRunId: string, selector: string) =>
      Boolean(expandedTeamMembers[expansionKey(workspaceId, teamRunId, selector)])),
    toggleTeamMember: vi.fn((workspaceId: string, teamRunId: string, selector: string) => {
      const key = expansionKey(workspaceId, teamRunId, selector);
      expandedTeamMembers[key] = !expandedTeamMembers[key];
    }),
    canTerminateTeam: options.canTerminateTeam ?? ((isActive: boolean) => isActive),
  };

  const wrapper = mount(WorkspaceHistoryWorkspaceSection, {
    props: {
      workspaceNode: {
        workspaceId: 'workspace:/ws/a',
        workspaceRootPath: '/ws/a',
        workspaceName: 'Workspace A',
        workspaceKind: 'filesystem',
        canRemoveFromWorkspaces: false,
        agents: [],
      },
      workspaceTeams: options.workspaceTeams ?? [team],
      workspaceTeamHistoryGroups: [],
      state,
      avatars: {
        showAgentAvatar: () => false,
        onAgentAvatarError: vi.fn(),
        getAgentInitials: () => 'A',
        showTeamAvatar: () => false,
        getTeamAvatarUrl: () => '',
        onTeamAvatarError: vi.fn(),
        getTeamInitials: () => 'TA',
        showTeamMemberAvatar: () => false,
        getTeamMemberAvatarUrl: () => '',
        onTeamMemberAvatarError: vi.fn(),
        getTeamMemberDisplayName: (member: any) => member.displayName,
        getTeamMemberInitials: () => 'W',
      },
      actions,
    },
    global: {
      stubs: { Icon: { template: '<span data-test="icon" />' } },
      mocks: {
        $t: (key: string) => ({
          'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title': 'Temporary task execution',
          'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.active_team_runs': 'Active team runs',
          'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.no_active_team_runs': 'No active team runs',
          'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.active_team_run': 'Active team run',
          'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.inactive_team_run': 'Inactive team run',
        }[key] ?? key),
      },
    },
  });

  return { wrapper, actions, state, liveContext, worker, team, selectedTeamRunId, selectedType };
};

describe('WorkspaceHistoryWorkspaceSection', () => {
  it('renders any-active definition activity and exact sibling run activity reactively', async () => {
    const currentAddress = createTeamExecutionAddress({ rootTeamRunId: 'team-run-active', memberAddress: '/worker' });
    const activeRun = {
      teamRunId: 'team-run-active',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team Alpha',
      workspaceRootPath: '/ws/a',
      summary: 'Active task',
      lastActivityAt: '2026-06-29T00:00:00.000Z',
      isActive: true,
      deleteLifecycle: 'READY',
      focusedExecutionAddress: currentAddress,
      rootTeam: rootRow([]),
      members: [],
      executionRows: [],
    };
    const inactiveRun = {
      ...activeRun,
      teamRunId: 'team-run-inactive',
      focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-inactive', memberAddress: '/worker' }),
      summary: 'Inactive task',
      lastActivityAt: '2026-06-30T00:00:00.000Z',
      isActive: false,
    };
    const { wrapper } = mountSubject({
      workspaceTeams: [activeRun, inactiveRun],
      teamExpanded: false,
      canTerminateTeam: () => false,
    });

    const groupRow = wrapper.get('[data-test="workspace-team-definition-row-team-def-1"]');
    expect(groupRow.get('[data-test="team-activity-dot"]').attributes()).toMatchObject({
      'data-active': 'true',
      'aria-label': 'Active team runs',
      title: 'Active team runs',
    });
    expect(wrapper.get('[data-test="workspace-team-row-team-run-active"] [data-test="team-activity-dot"]').attributes('data-active')).toBe('true');
    expect(wrapper.get('[data-test="workspace-team-row-team-run-inactive"] [data-test="team-activity-dot"]').attributes('data-active')).toBe('false');

    await wrapper.setProps({ workspaceTeams: [{ ...activeRun, isActive: false }, inactiveRun] });
    await wrapper.vm.$nextTick();
    expect(groupRow.get('[data-test="team-activity-dot"]').attributes('data-active')).toBe('false');
    expect(groupRow.get('[data-test="team-activity-dot"]').attributes('aria-label')).toBe('No active team runs');
  });

  it('renders and selects exact stable and task-Agent execution rows', async () => {
    const { wrapper, actions, state } = mountSubject();

    const stableRow = wrapper.get('[data-row-kind="stable_member"]');
    expect(stableRow.text()).toContain('worker');
    await stableRow.trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'stable_member',
        memberAddress: '/worker',
        executionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-1', memberAddress: '/worker' }),
      }),
      'workspace:/ws/a',
    );
    expect(state.toggleTeamMember).not.toHaveBeenCalled();

    actions.onSelectTeamMember.mockClear();
    const taskRow = wrapper.get('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRow.attributes('data-transient-kind')).toBe('task_agent');
    expect(taskRow.attributes('data-member-address')).toBe('/worker');
    expect(taskRow.classes()).toContain('ring-indigo-200');
    expect(taskRow.text()).toContain('worker');
    expect(taskRow.get('[data-test="workspace-transient-status-dot"]').findAll('circle')).toHaveLength(8);
    await taskRow.trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'transient_execution',
        transientKind: 'task_agent',
        executionAddress: createTeamExecutionAddress({
          rootTeamRunId: 'team-run-1',
          memberAddress: '/worker',
          taskAgentRunId: 'task-agent-run-1',
        }),
      }),
      'workspace:/ws/a',
    );
  });

  it('marks only the selected TeamRun current when focused member addresses repeat', async () => {
    const teamAMember = stableAgent('/worker');
    const teamBMember = stableAgent('/worker', {
      teamRunId: 'team-run-2',
      agentRunId: 'worker-run-2',
    });
    const buildTeam = (teamRunId: string, member: TeamMemberTreeRow): TeamTreeNode => {
      const focusedExecutionAddress = createTeamExecutionAddress({
        rootTeamRunId: teamRunId,
        memberAddress: '/worker',
      });
      const rootTeam = {
        ...rootRow([member]),
        teamRunId,
        teamRunIdForNode: teamRunId,
      };
      return {
        teamRunId,
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a',
        summary: 'Team task summary',
        lastActivityAt: '2026-06-30T00:00:00.000Z',
        isActive: true,
        deleteLifecycle: 'READY',
        focusedExecutionAddress,
        rootTeam,
        members: [member],
        executionRows: [{
          kind: 'stable_member',
          teamRunId,
          memberAddress: '/worker',
          executionAddress: focusedExecutionAddress,
          memberKind: 'agent',
          displayName: 'worker',
          depth: 0,
          hasChildren: false,
          row: member,
        }],
      };
    };
    const teamA = buildTeam('team-run-1', teamAMember);
    const teamB = buildTeam('team-run-2', teamBMember);
    const { wrapper, selectedTeamRunId, selectedType } = mountSubject({
      workspaceTeams: [teamA, teamB],
      selectedTeamRunId: 'team-run-2',
    });

    const teamARow = () => wrapper.get('[data-test="workspace-team-member-team-run-1-/worker"]');
    const teamBRow = () => wrapper.get('[data-test="workspace-team-member-team-run-2-/worker"]');
    expect(teamARow().attributes('aria-current')).toBeUndefined();
    expect(teamBRow().attributes('aria-current')).toBe('true');
    expect(teamARow().classes()).not.toContain('bg-indigo-50');
    expect(teamBRow().classes()).toContain('bg-indigo-50');

    selectedTeamRunId.value = null;
    await wrapper.vm.$nextTick();
    expect(teamARow().attributes('aria-current')).toBeUndefined();
    expect(teamBRow().attributes('aria-current')).toBeUndefined();

    selectedTeamRunId.value = 'team-run-1';
    selectedType.value = 'agent';
    await wrapper.vm.$nextTick();
    expect(teamARow().attributes('aria-current')).toBeUndefined();
    expect(teamBRow().attributes('aria-current')).toBeUndefined();
  });

  it('toggles an exact task-Team subtree while keeping task details out of the tree', async () => {
    const worker = stableAgent('/worker');
    const stableReviewer = stableAgent('/study_group/reviewer', { displayName: 'reviewer' });
    const stableStudyGroup: TeamMemberTreeRow = {
      ...stableAgent('/study_group', { displayName: 'Study Group' }),
      kind: 'agent_team',
      agentRunId: null,
      teamDefinitionId: 'study-group-definition',
      teamRunIdForNode: 'study-group-run',
      coordinatorAddress: '/study_group/reviewer',
      currentStatus: null,
      children: [stableReviewer],
    };
    const taskTeamAddress = createTeamExecutionAddress({
      rootTeamRunId: 'team-run-1',
      taskTeamRunIds: ['task-team-run-1'],
      memberAddress: '/study_group',
    });
    const taskChildAddress = createTeamExecutionAddress({
      rootTeamRunId: 'team-run-1',
      taskTeamRunIds: ['task-team-run-1'],
      memberAddress: '/study_group/reviewer',
    });
    const liveContext = buildTestTeamContext({
      teamRunId: 'team-run-1',
      rootChildren: [
        testAgentNode('/worker', { agentRunId: worker.agentRunId! }),
        testSubTeamNode('/study_group', [
          testAgentNode('/study_group/reviewer', { agentRunId: stableReviewer.agentRunId! }),
        ]),
      ],
      coordinatorAddress: '/worker',
      focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-1', memberAddress: '/worker' }),
      tasks: [testTaskProjection({
        taskId: 'task_0002',
        executionAddress: taskTeamAddress,
        senderAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-1', memberAddress: '/worker' }),
        content: 'Review design body should stay on the right.',
        referenceFiles: [{
          referenceId: 'ref-design',
          path: '/tmp/design-spec.md',
          type: 'file',
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:00:00.000Z',
        }],
      })],
      executionMessages: [{
        type: 'AGENT_STATUS',
        payload: {
          agent_execution: {
            kind: 'task_team_agent',
            execution_address: toTeamExecutionAddressDto(taskChildAddress),
            agent_run_id: 'task-reviewer-run',
          },
          status: 'running',
          trigger: null,
          tool_name: null,
          error_message: null,
          error_details: null,
        },
      }],
    });
    const { wrapper, actions } = mountSubject({ stableChildren: [worker, stableStudyGroup], liveContext });

    let taskRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0].attributes('data-transient-kind')).toBe('task_team');
    expect(taskRows[0].attributes('data-member-address')).toBe('/study_group');
    const disclosure = () => wrapper.get('[data-test="workspace-team-transient-disclosure"]');
    expect(disclosure().attributes('aria-expanded')).toBe('false');

    await taskRows[0].trigger('click');
    await wrapper.vm.$nextTick();
    taskRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRows).toHaveLength(2);
    expect(taskRows[1].attributes('data-transient-kind')).toBe('task_team_child');
    expect(taskRows[1].attributes('data-member-address')).toBe('/study_group/reviewer');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith(
      expect.objectContaining({ executionAddress: taskTeamAddress }),
      'workspace:/ws/a',
    );
    expect(disclosure().attributes('aria-expanded')).toBe('true');

    actions.onSelectTeamMember.mockClear();
    await disclosure().trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('[data-test="workspace-team-transient-execution-row"]')).toHaveLength(1);
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('Review design body should stay on the right.');
    expect(wrapper.text()).not.toContain('/tmp/design-spec.md');
    expect(wrapper.text()).not.toContain('raw_task_argument');
  });

  it('removes transient execution rows when the exact live projection disappears', async () => {
    const { wrapper, team, worker } = mountSubject();
    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(true);

    await wrapper.setProps({
      workspaceTeams: [{
        ...team,
        focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-1', memberAddress: '/worker' }),
        executionRows: buildRunHistoryTeamExecutionRows({
          ...team,
          rootTeam: rootRow([worker]),
          members: [worker],
        }),
      }],
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-row-kind="stable_member"]').exists()).toBe(true);
  });

  it('toggles stable nested Team children from row body and disclosure with exact addresses', async () => {
    const reviewLead = stableAgent('/software_team/review_lead', { displayName: 'review_lead' });
    const structuralTeam: TeamMemberTreeRow = {
      ...stableAgent('/software_team', { displayName: 'Software Engineering Team' }),
      kind: 'agent_team',
      agentRunId: null,
      teamDefinitionId: 'software-team',
      teamRunIdForNode: 'software-team-run',
      coordinatorAddress: '/software_team/review_lead',
      currentStatus: null,
      children: [reviewLead],
    };
    const liveContext = buildTestTeamContext({
      teamRunId: 'team-run-1',
      rootChildren: [testSubTeamNode('/software_team', [
        testAgentNode('/software_team/review_lead', { agentRunId: reviewLead.agentRunId! }),
      ])],
      coordinatorAddress: '/software_team/review_lead',
      focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run-1', memberAddress: '/software_team/review_lead' }),
    });
    const { wrapper, actions, state } = mountSubject({ stableChildren: [structuralTeam], liveContext });

    const nestedRow = () => wrapper.get('[data-test="workspace-team-member-team-run-1-/software_team"]');
    const childRow = () => wrapper.find('[data-test="workspace-team-member-team-run-1-/software_team/review_lead"]');
    const disclosure = () => wrapper.get('[data-test="workspace-team-member-disclosure"]');
    expect(disclosure().attributes('data-member-address')).toBe('/software_team');
    expect(childRow().exists()).toBe(false);

    await nestedRow().trigger('click');
    await wrapper.vm.$nextTick();
    expect(state.toggleTeamMember).toHaveBeenLastCalledWith('workspace:/ws/a', 'team-run-1', '/software_team');
    expect(actions.onSelectTeamMember).toHaveBeenLastCalledWith(
      expect.objectContaining({ memberAddress: '/software_team' }),
      'workspace:/ws/a',
    );
    expect(childRow().exists()).toBe(true);

    await nestedRow().trigger('keydown.space');
    await wrapper.vm.$nextTick();
    expect(childRow().exists()).toBe(false);

    actions.onSelectTeamMember.mockClear();
    await disclosure().trigger('click');
    await wrapper.vm.$nextTick();
    expect(childRow().exists()).toBe(true);
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();
  });
});
