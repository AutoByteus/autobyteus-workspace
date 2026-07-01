import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import WorkspaceHistoryWorkspaceSection from '../WorkspaceHistoryWorkspaceSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

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
    currentStatus: AgentTeamStatus.Running,
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
    isTeamExpanded: () => true,
    getLiveTeamContext: () => liveContext,
    isTeamMemberExpanded: vi.fn((workspaceId: string, teamRunId: string, memberRouteKey: string) =>
      Boolean(expandedTeamMembers[expansionKey(workspaceId, teamRunId, memberRouteKey)])),
    toggleTeamMember: vi.fn((workspaceId: string, teamRunId: string, memberRouteKey: string) => {
      const key = expansionKey(workspaceId, teamRunId, memberRouteKey);
      expandedTeamMembers[key] = !expandedTeamMembers[key];
    }),
    canTerminateTeam: () => true,
  };

  const wrapper = mount(WorkspaceHistoryWorkspaceSection, {
    props: {
      workspaceNode: {
        workspaceId: 'workspace:/ws/a',
        workspaceRootPath: '/ws/a',
        workspaceName: 'Workspace A',
        canRemoveFromWorkspaces: false,
        agents: [],
      },
      workspaceTeams: [team],
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
        }[key] ?? key),
      },
    },
  });

  return { wrapper, actions, state, liveContext, worker };
};

describe('WorkspaceHistoryWorkspaceSection', () => {
  it('renders transient execution rows inline with ghost/dashed semantics and focus identity', async () => {
    const { wrapper, actions } = mountSubject();

    const stableRow = wrapper.get('[data-test="workspace-team-member-team-run-1-worker"]');
    expect(stableRow.attributes('data-row-kind')).toBe('stable_member');
    expect(stableRow.text()).toContain('worker');
    expect(stableRow.classes()).not.toContain('text-indigo-900');

    const transientRow = wrapper.get('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRow.attributes('data-row-kind')).toBe('transient_execution');
    expect(transientRow.attributes('data-transient-kind')).toBe('task_agent');
    expect(transientRow.attributes('data-member-route-key')).toBe('task-agent-run-1');
    expect(transientRow.attributes('style')).toContain('margin-left: 12px');
    expect(transientRow.classes()).toContain('bg-indigo-50/40');
    expect(transientRow.classes()).toContain('ring-indigo-200');
    expect(transientRow.findAll('.rounded-full')).toHaveLength(1);
    expect(transientRow.findAll('.border-dotted')).toHaveLength(1);
    const statusDot = transientRow.get('[data-test="workspace-transient-status-dot"]');
    expect(statusDot.classes()).toEqual(expect.arrayContaining([
      'rounded-full',
      'border-2',
      'border-dotted',
      'border-blue-500',
      'bg-transparent',
    ]));
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
      expect.any(Array),
    );
  });

  it('keeps transient task-team children collapsed until the row disclosure is toggled', async () => {
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
      currentStatus: AgentStatus.Running,
    };

    const { wrapper } = mountSubject({
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
        memberNodesByRouteKey: new Map([
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

    const disclosure = wrapper.get('[data-test="workspace-team-transient-disclosure"][data-member-route-key="task-team-run-1"]');
    expect(disclosure.attributes('aria-expanded')).toBe('false');

    await disclosure.trigger('click');
    await wrapper.vm.$nextTick();
    transientRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRows).toHaveLength(2);
    for (const transientRow of transientRows) {
      expect(transientRow.findAll('.rounded-full')).toHaveLength(1);
      expect(transientRow.findAll('.border-dotted')).toHaveLength(1);
      expect(transientRow.get('[data-test="workspace-transient-status-dot"]').classes()).toContain('border-2');
    }
    expect(transientRows[1].attributes('data-transient-kind')).toBe('task_team_child');
    expect(transientRows[1].attributes('data-member-route-key')).toBe('task-team-run-1/review_lead');
    expect(transientRows[1].attributes('style')).toContain('margin-left: 12px');
    expect(transientRows[1].text()).toContain('review_lead');
    expect(disclosure.attributes('aria-expanded')).toBe('true');

    await disclosure.trigger('click');
    await wrapper.vm.$nextTick();
    transientRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(transientRows).toHaveLength(1);
    expect(wrapper.find('[data-member-route-key="task-team-run-1/review_lead"]').exists()).toBe(false);

    const renderedText = wrapper.text();
    expect(renderedText).not.toContain('Review design body should stay on the right.');
    expect(renderedText).not.toContain('/tmp/design-spec.md');
    expect(renderedText).not.toContain('raw_task_argument');
  });

  it('removes transient execution rows when live projection cleanup removes the backing node', async () => {
    const { wrapper, state } = mountSubject();

    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(true);

    await wrapper.setProps({
      state: {
        ...state,
        getLiveTeamContext: () => ({
          teamRunId: 'team-run-1',
          focusedMemberRouteKey: 'worker',
          memberTree: [
            { memberKind: 'agent', memberName: 'worker', displayName: 'worker', memberPath: ['worker'], memberRouteKey: 'worker', memberRunId: 'worker-run', agentDefinitionId: 'worker-agent' },
          ],
          leafAgentContextsByRouteKey: new Map(),
        }),
      },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="workspace-team-member-team-run-1-worker"]').exists()).toBe(true);
  });
});
