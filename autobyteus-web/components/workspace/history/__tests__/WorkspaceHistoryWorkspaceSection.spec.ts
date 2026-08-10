import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import WorkspaceHistoryWorkspaceSection from '../WorkspaceHistoryWorkspaceSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunHistoryTeamExecutionRows } from '~/stores/runHistoryTeamExecutionRows';

const stableMember = (memberRouteKey: string, overrides: Record<string, any> = {}) => ({
  teamRunId: 'team-run-1',
  memberKind: 'agent',
  memberRouteKey,
  memberPath: [memberRouteKey],
  memberName: memberRouteKey,
  displayName: memberRouteKey,
  memberRunId: `${memberRouteKey}-run`,
  workspaceRootPath: '/ws/a',
  summary: 'Team task summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: AgentStatus.Idle,
  lastKnownStatus: 'ACTIVE',
  isActive: true,
  deleteLifecycle: 'READY',
  children: [],
  ...overrides,
});

const mountSubject = (options: {
  teamOverride?: Record<string, any>;
  liveContextOverride?: Record<string, any>;
  workspaceTeams?: any[];
  workspaceTeamHistoryGroups?: any[];
  teamExpanded?: boolean;
  canTerminateTeam?: (isActive: boolean) => boolean;
} = {}) => {
  const worker = stableMember('worker');
  const defaultTeam = {
    teamRunId: 'team-run-1',
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    workspaceRootPath: '/ws/a',
    summary: 'Team task summary',
    lastActivityAt: '2026-06-30T00:00:00.000Z',
    lastKnownStatus: 'ACTIVE',
    isActive: true,
    deleteLifecycle: 'READY',
    focusedMemberRouteKey: 'worker',
    members: [worker],
    memberTree: [worker],
  } as any;
  const team = {
    ...defaultTeam,
    ...options.teamOverride,
  } as any;
  const taskAgentNode = {
    memberKind: 'agent',
    memberName: 'worker · task_0001',
    displayName: 'worker · task_0001',
    memberPath: ['worker', 'task-agent-run-1'],
    memberRouteKey: 'task-agent-run-1',
    memberRunId: 'task-agent-run-1',
    agentDefinitionId: 'worker-agent',
    isTaskAgentInstance: true,
    taskAgentRunId: 'task-agent-run-1',
    logicalMemberRouteKey: 'worker',
    taskId: 'task_0001',
    currentStatus: AgentStatus.Running,
  };
  const defaultLiveContext = {
    teamRunId: 'team-run-1',
    focusedMemberRouteKey: 'task-agent-run-1',
    memberTree: [
      { memberKind: 'agent', memberName: 'worker', displayName: 'worker', memberPath: ['worker'], memberRouteKey: 'worker', memberRunId: 'worker-run', agentDefinitionId: 'worker-agent' },
      taskAgentNode,
    ],
    leafAgentContextsByRouteKey: new Map([
      ['task-agent-run-1', { state: { currentStatus: AgentStatus.Running } }],
    ]),
  } as any;
  const liveContext = {
    ...defaultLiveContext,
    ...options.liveContextOverride,
  } as any;
  const projectedTeam = {
    ...team,
    focusedMemberRouteKey: liveContext.focusedMemberRouteKey ?? team.focusedMemberRouteKey,
  } as any;
  projectedTeam.executionRows = buildRunHistoryTeamExecutionRows(projectedTeam, liveContext);
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
  const expansionKey = (workspaceId: string, teamRunId: string, memberRouteKey: string) =>
    `${workspaceId}::${teamRunId}::${memberRouteKey}`;
  const state = {
    selectedRunId: null,
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
    isTeamMemberExpanded: vi.fn((workspaceId: string, teamRunId: string, memberRouteKey: string) =>
      Boolean(expandedTeamMembers[expansionKey(workspaceId, teamRunId, memberRouteKey)])),
    toggleTeamMember: vi.fn((workspaceId: string, teamRunId: string, memberRouteKey: string) => {
      const key = expansionKey(workspaceId, teamRunId, memberRouteKey);
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
      workspaceTeams: options.workspaceTeams ?? [projectedTeam],
      workspaceTeamHistoryGroups: options.workspaceTeamHistoryGroups ?? [],
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
        getTeamMemberDisplayName: (member: any) => member.displayName || member.memberName,
        getTeamMemberInitials: () => 'W',
      },
      actions,
    },
    global: {
      stubs: {
        Icon: { template: '<span data-test="icon" />' },
      },
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

  return { wrapper, actions, state, liveContext, worker, team: projectedTeam };
};

describe('WorkspaceHistoryWorkspaceSection', () => {
  it('renders any-active definition activity and exact sibling run activity reactively', async () => {
    const activeWorker = stableMember('active-worker', {
      currentStatus: AgentStatus.Error,
    });
    const activeRun = {
      teamRunId: 'team-run-active',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team Alpha',
      workspaceRootPath: '/ws/a',
      summary: 'Active task',
      lastActivityAt: '2026-06-29T00:00:00.000Z',
      isActive: true,
      deleteLifecycle: 'READY',
      focusedMemberRouteKey: 'active-worker',
      members: [activeWorker],
      memberTree: [activeWorker],
    } as any;
    const inactiveRun = {
      ...activeRun,
      teamRunId: 'team-run-inactive',
      summary: 'Inactive task',
      lastActivityAt: '2026-06-30T00:00:00.000Z',
      isActive: false,
    } as any;
    const { wrapper } = mountSubject({
      workspaceTeams: [activeRun, inactiveRun],
      teamExpanded: false,
      canTerminateTeam: () => false,
    });

    const groupRow = wrapper.get('[data-test="workspace-team-definition-row-team-def-1"]');
    const groupDot = groupRow.get('[data-test="team-activity-dot"]');
    expect(groupDot.attributes()).toMatchObject({
      'data-active': 'true',
      'aria-label': 'Active team runs',
      title: 'Active team runs',
    });
    expect(groupDot.classes()).toContain('bg-blue-500');

    const activeRow = wrapper.get('[data-test="workspace-team-row-team-run-active"]');
    const inactiveRow = wrapper.get('[data-test="workspace-team-row-team-run-inactive"]');
    expect(activeRow.get('[data-test="team-activity-dot"]').attributes('data-active')).toBe('true');
    expect(activeRow.get('[data-test="team-activity-dot"]').attributes('aria-label')).toBe('Active team run');
    expect(inactiveRow.get('[data-test="team-activity-dot"]').attributes('data-active')).toBe('false');
    expect(inactiveRow.get('[data-test="team-activity-dot"]').attributes('aria-label')).toBe('Inactive team run');
    expect(activeRow.element.parentElement?.querySelector('button[title$="terminate_team"]')).toBeNull();

    await wrapper.setProps({
      workspaceTeams: [
        { ...activeRun, isActive: false },
        inactiveRun,
      ],
    });
    await wrapper.vm.$nextTick();

    expect(groupRow.get('[data-test="team-activity-dot"]').attributes('data-active')).toBe('false');
    expect(groupRow.get('[data-test="team-activity-dot"]').attributes('aria-label')).toBe('No active team runs');
    expect(wrapper.get('[data-test="workspace-team-row-team-run-active"] [data-test="team-activity-dot"]').attributes('data-active')).toBe('false');
  });

  it('renders transient execution rows inline with ghost/dashed semantics and focus identity', async () => {
    const { wrapper, actions, state } = mountSubject();

    const stableRow = wrapper.get('[data-test="workspace-team-member-team-run-1-worker"]');
    expect(stableRow.attributes('data-row-kind')).toBe('stable_member');
    expect(stableRow.text()).toContain('worker');
    expect(stableRow.classes()).not.toContain('text-indigo-900');

    await stableRow.trigger('click');

    expect(state.toggleTeamMember).toHaveBeenCalledWith(
      'workspace:/ws/a',
      'team-run-1',
      'worker',
    );
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-run-1',
        memberRouteKey: 'worker',
        kind: 'stable_member',
      }),
      'workspace:/ws/a',
    );
    actions.onSelectTeamMember.mockClear();

    const transientRow = wrapper.get('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRow.attributes('data-row-kind')).toBe('transient_execution');
    expect(transientRow.attributes('data-transient-kind')).toBe('task_agent');
    expect(transientRow.attributes('data-member-route-key')).toBe('task-agent-run-1');
    expect(transientRow.attributes('style')).toContain('margin-left: 12px');
    expect(transientRow.classes()).toContain('bg-indigo-50/40');
    expect(transientRow.classes()).toContain('ring-indigo-200');
    expect(transientRow.findAll('[data-test="workspace-transient-status-dot"]')).toHaveLength(1);
    const statusDot = transientRow.get('[data-test="workspace-transient-status-dot"]');
    expect(statusDot.element.tagName.toLowerCase()).toBe('svg');
    expect(statusDot.classes()).toEqual(expect.arrayContaining([
      'h-2.5',
      'w-2.5',
      'text-blue-700',
    ]));
    const statusRingDots = statusDot.findAll('circle');
    expect(statusRingDots).toHaveLength(8);
    expect(statusRingDots[0].attributes('fill')).toBe('currentColor');
    expect(statusRingDots[0].attributes('r')).toBe('0.95');
    expect(transientRow.text()).toContain('worker · task_0001');
    expect(transientRow.text()).not.toContain('Temporary');

    await transientRow.trigger('click');

    expect(actions.onSelectTeamMember).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-run-1',
        memberRouteKey: 'task-agent-run-1',
        kind: 'transient_execution',
      }),
      'workspace:/ws/a',
    );
  });

  it('toggles transient task-team children from the row body and keeps disclosure toggle-only', async () => {
    const worker = stableMember('worker');
    const reviewLead = stableMember('SoftwareEngineeringTeam/review_lead', {
      memberPath: ['SoftwareEngineeringTeam', 'review_lead'],
      memberName: 'review_lead',
      displayName: 'review_lead',
    });
    const structuralTeam = stableMember('SoftwareEngineeringTeam', {
      memberKind: 'agent_team',
      memberPath: ['SoftwareEngineeringTeam'],
      memberName: 'Software Engineering Team',
      displayName: 'Software Engineering Team',
      teamDefinitionId: 'software-team',
      children: [reviewLead],
    });
    const taskTeamChildNode = {
      memberKind: 'agent',
      memberName: 'review_lead',
      displayName: 'review_lead',
      memberPath: ['task-team-run-1', 'review_lead'],
      memberRouteKey: 'task-team-run-1/review_lead',
      memberRunId: 'task-team-run-1::review_lead',
      agentDefinitionId: 'review-lead-agent',
      isTaskTeamChildProjection: true,
      parentTaskTeamRunId: 'task-team-run-1',
      currentStatus: AgentStatus.Idle,
    };
    const taskTeamNode = {
      memberKind: 'agent_team',
      memberName: 'Software Engineering Team · task_0002',
      displayName: 'Software Engineering Team · task_0002',
      memberPath: ['task-team-run-1'],
      memberRouteKey: 'task-team-run-1',
      memberRunId: 'task-team-run-1',
      teamDefinitionId: 'software-team',
      children: [taskTeamChildNode],
      isTaskTeamInstance: true,
      taskTeamRunId: 'task-team-run-1',
      taskId: 'task_0002',
      taskDescription: 'Review design body should stay on the right.',
      taskReferenceFiles: [{ referenceId: 'ref-design', path: '/tmp/design-spec.md', type: 'file' }],
      taskArguments: { raw_task_argument: 'must not render in Workspaces' },
    };

    const { wrapper, actions } = mountSubject({
      teamOverride: {
        members: [worker, structuralTeam],
        memberTree: [worker, structuralTeam],
      },
      liveContextOverride: {
        memberTree: [
          { memberKind: 'agent', memberName: 'worker', displayName: 'worker', memberPath: ['worker'], memberRouteKey: 'worker', memberRunId: 'worker-run', agentDefinitionId: 'worker-agent' },
          {
            memberKind: 'agent_team',
            memberName: 'Software Engineering Team',
            displayName: 'Software Engineering Team',
            memberPath: ['SoftwareEngineeringTeam'],
            memberRouteKey: 'SoftwareEngineeringTeam',
            memberRunId: 'software-team-run',
            teamDefinitionId: 'software-team',
            children: [
              { memberKind: 'agent', memberName: 'review_lead', displayName: 'review_lead', memberPath: ['SoftwareEngineeringTeam', 'review_lead'], memberRouteKey: 'SoftwareEngineeringTeam/review_lead', memberRunId: 'review-lead-run', agentDefinitionId: 'review-lead' },
            ],
          },
          taskTeamNode,
        ],
        memberNodesByRouteKey: new Map<string, any>([
          ['task-team-run-1', taskTeamNode],
          ['task-team-run-1/review_lead', taskTeamChildNode],
        ]),
        leafAgentContextsByRouteKey: new Map(),
        focusedMemberRouteKey: 'worker',
      },
    });

    let transientRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRows).toHaveLength(1);
    expect(transientRows[0].attributes('data-transient-kind')).toBe('task_team');
    expect(transientRows[0].attributes('data-member-route-key')).toBe('task-team-run-1');
    expect(transientRows[0].text()).toContain('Software Engineering Team · task_0002');
    expect(wrapper.find('[data-member-route-key="task-team-run-1/review_lead"]').exists()).toBe(false);

    let disclosure = wrapper.get('[data-test="workspace-team-transient-disclosure"][data-member-route-key="task-team-run-1"]');
    expect(disclosure.attributes('aria-expanded')).toBe('false');

    actions.onSelectTeamMember.mockClear();
    await transientRows[0].trigger('click');
    await wrapper.vm.$nextTick();
    transientRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRows).toHaveLength(2);
    expect(transientRows[0].findAll('[data-test="workspace-transient-status-dot"]')).toHaveLength(0);
    const childStatusDots = transientRows[1].findAll('[data-test="workspace-transient-status-dot"]');
    expect(childStatusDots).toHaveLength(1);
    expect(childStatusDots[0].element.tagName.toLowerCase()).toBe('svg');
    expect(childStatusDots[0].findAll('circle')).toHaveLength(8);
    expect(transientRows[1].attributes('data-transient-kind')).toBe('task_team_child');
    expect(transientRows[1].attributes('data-member-route-key')).toBe('task-team-run-1/review_lead');
    expect(transientRows[1].attributes('style')).toContain('margin-left: 12px');
    expect(transientRows[1].text()).toContain('review_lead');
    disclosure = wrapper.get('[data-test="workspace-team-transient-disclosure"][data-member-route-key="task-team-run-1"]');
    expect(disclosure.attributes('aria-expanded')).toBe('true');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'transient_execution',
        transientKind: 'task_team',
        memberRouteKey: 'task-team-run-1',
      }),
      'workspace:/ws/a',
    );

    actions.onSelectTeamMember.mockClear();
    await wrapper
      .get('[data-test="workspace-team-transient-execution-row"][data-member-route-key="task-team-run-1"]')
      .trigger('click');
    await wrapper.vm.$nextTick();
    transientRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRows).toHaveLength(1);
    expect(wrapper.find('[data-member-route-key="task-team-run-1/review_lead"]').exists()).toBe(false);
    expect(actions.onSelectTeamMember).toHaveBeenCalledTimes(1);

    actions.onSelectTeamMember.mockClear();
    disclosure = wrapper.get('[data-test="workspace-team-transient-disclosure"][data-member-route-key="task-team-run-1"]');
    await disclosure.trigger('click');
    await wrapper.vm.$nextTick();
    transientRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRows).toHaveLength(2);
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();

    disclosure = wrapper.get('[data-test="workspace-team-transient-disclosure"][data-member-route-key="task-team-run-1"]');
    await disclosure.trigger('click');
    await wrapper.vm.$nextTick();
    transientRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRows).toHaveLength(1);
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();

    const renderedText = wrapper.text();
    expect(renderedText).not.toContain('Review design body should stay on the right.');
    expect(renderedText).not.toContain('/tmp/design-spec.md');
    expect(renderedText).not.toContain('raw_task_argument');
  });

  it('removes transient execution rows when live projection cleanup removes the backing node', async () => {
    const { wrapper, team, worker } = mountSubject();

    await wrapper.get('[data-test="workspace-team-member-team-run-1-worker"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(true);

    await wrapper.setProps({
      workspaceTeams: [{
        ...team,
        focusedMemberRouteKey: 'worker',
        executionRows: [{
          kind: 'stable_member',
          teamRunId: 'team-run-1',
          memberKind: 'agent',
          memberRouteKey: 'worker',
          memberPath: ['worker'],
          displayName: 'worker',
          depth: 0,
          hasChildren: false,
          row: worker,
        }],
      }],
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="workspace-team-member-team-run-1-worker"]').exists()).toBe(true);
  });

  it('toggles stable nested team row children from row body click and keyboard while selecting the row', async () => {
    const reviewLead = stableMember('SoftwareEngineeringTeam/review_lead', {
      memberPath: ['SoftwareEngineeringTeam', 'review_lead'],
      memberName: 'review_lead',
      displayName: 'review_lead',
    });
    const structuralTeam = stableMember('SoftwareEngineeringTeam', {
      memberKind: 'agent_team',
      memberPath: ['SoftwareEngineeringTeam'],
      memberName: 'Software Engineering Team',
      displayName: 'Software Engineering Team',
      teamDefinitionId: 'software-team',
      children: [reviewLead],
    });

    const { wrapper, actions, state } = mountSubject({
      teamOverride: {
        focusedMemberRouteKey: 'SoftwareEngineeringTeam',
        members: [structuralTeam],
        memberTree: [structuralTeam],
      },
      liveContextOverride: {
        focusedMemberRouteKey: 'SoftwareEngineeringTeam',
        memberTree: [structuralTeam],
        leafAgentContextsByRouteKey: new Map(),
      },
    });

    const childSelector = '[data-test="workspace-team-member-team-run-1-SoftwareEngineeringTeam/review_lead"]';
    let nestedRow = wrapper.get('[data-test="workspace-team-member-team-run-1-SoftwareEngineeringTeam"]');
    let disclosure = wrapper.get('[data-test="workspace-team-member-disclosure"][data-member-route-key="SoftwareEngineeringTeam"]');
    expect(disclosure.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find(childSelector).exists()).toBe(false);

    await nestedRow.trigger('click');
    await wrapper.vm.$nextTick();

    expect(state.toggleTeamMember).toHaveBeenLastCalledWith(
      'workspace:/ws/a',
      'team-run-1',
      'SoftwareEngineeringTeam',
    );
    expect(actions.onSelectTeamMember).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'stable_member',
        memberRouteKey: 'SoftwareEngineeringTeam',
      }),
      'workspace:/ws/a',
    );
    expect(wrapper.find(childSelector).exists()).toBe(true);

    nestedRow = wrapper.get('[data-test="workspace-team-member-team-run-1-SoftwareEngineeringTeam"]');
    await nestedRow.trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find(childSelector).exists()).toBe(false);

    nestedRow = wrapper.get('[data-test="workspace-team-member-team-run-1-SoftwareEngineeringTeam"]');
    await nestedRow.trigger('keydown.enter');
    await wrapper.vm.$nextTick();
    expect(wrapper.find(childSelector).exists()).toBe(true);

    nestedRow = wrapper.get('[data-test="workspace-team-member-team-run-1-SoftwareEngineeringTeam"]');
    await nestedRow.trigger('keydown.space');
    await wrapper.vm.$nextTick();
    expect(wrapper.find(childSelector).exists()).toBe(false);
    expect(actions.onSelectTeamMember).toHaveBeenCalledTimes(4);

    actions.onSelectTeamMember.mockClear();
    disclosure = wrapper.get('[data-test="workspace-team-member-disclosure"][data-member-route-key="SoftwareEngineeringTeam"]');
    await disclosure.trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find(childSelector).exists()).toBe(true);
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();
  });
});
