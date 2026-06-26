import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamMemberMonitorTile from '../TeamMemberMonitorTile.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

vi.mock('~/composables/useTeamMemberPresentation', () => ({
  useTeamMemberPresentation: () => ({
    getMemberDisplayName: () => 'Professor',
    getMemberAvatarUrl: () => '',
    getMemberInitials: () => 'P',
    getInterAgentSenderNameById: () => ({}),
  }),
}));

const buildMemberContext = () => ({
  config: {
    agentDefinitionId: 'agent-professor-def',
    agentDefinitionName: 'Professor',
    agentAvatarUrl: null,
  },
  state: {
    currentStatus: AgentStatus.Idle,
    conversation: {
      id: 'team-1::professor',
      createdAt: '2026-03-07T00:00:00.000Z',
      updatedAt: '2026-03-07T00:00:00.000Z',
      agentName: 'Professor',
      messages: [
        {
          type: 'user',
          text: 'could you give student a programming problem to solve',
          timestamp: new Date('2026-03-07T00:00:00.000Z'),
        },
        {
          type: 'ai',
          text: '',
          timestamp: new Date('2026-03-07T00:00:01.000Z'),
          isComplete: false,
          segments: [
            {
              type: 'inter_agent_message',
              senderAgentRunId: 'member-student',
              recipientRoleName: 'student',
              messageType: 'message',
              content: 'Please solve this programming exercise and explain your approach.',
            },
          ],
        },
        {
          type: 'ai',
          text: '',
          timestamp: new Date('2026-03-07T00:00:02.000Z'),
          isComplete: false,
          segments: [],
        },
      ],
    },
  },
});

describe('TeamMemberMonitorTile', () => {
  it('renders a single-line header status and preview body when messages exist', () => {
    const wrapper = mount(TeamMemberMonitorTile, {
      props: {
        memberName: 'professor',
        memberContext: buildMemberContext() as any,
      },
      global: {
        stubs: {
          AgentConversationFeed: {
            props: ['showTokenCosts', 'showTotalUsage'],
            template: '<div data-test="conversation-feed">{{ showTokenCosts }} {{ showTotalUsage }}</div>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Professor');
    const status = wrapper.find('[data-test="team-member-status"]');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('Idle');
    expect(wrapper.get('[data-test="team-member-header"]').text()).toContain('Idle');
    const feed = wrapper.find('[data-test="conversation-feed"]');
    expect(feed.exists()).toBe(true);
    expect(feed.text()).toContain('false false');
    expect(wrapper.classes()).toContain('h-full');
    expect(wrapper.classes()).toContain('min-h-[420px]');
    expect(wrapper.text()).not.toContain('professor');
  });

  it('falls back to canonical offline status for focused subteam tiles without a member context', () => {
    const subteamNode = {
      memberKind: 'agent_team',
      memberName: 'BuildSquad',
      displayName: 'BuildSquad',
      memberPath: ['BuildSquad'],
      memberRouteKey: 'BuildSquad',
      teamDefinitionId: 'build-squad-team',
      children: [
        {
          memberKind: 'agent',
          memberName: 'review_lead',
          displayName: 'review_lead',
          memberPath: ['BuildSquad', 'review_lead'],
          memberRouteKey: 'BuildSquad/review_lead',
          agentDefinitionId: 'review-lead-agent',
        },
      ],
    };

    const wrapper = mount(TeamMemberMonitorTile, {
      props: {
        memberNode: subteamNode as any,
        memberContext: null,
        isFocused: true,
        teamContext: {
          focusedMemberRouteKey: 'BuildSquad',
          leafAgentContextsByRouteKey: new Map(),
        } as any,
      },
    });

    const status = wrapper.find('[data-test="team-member-status"]');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('Offline');
    expect(wrapper.text()).toContain('BuildSquad');
    expect(wrapper.text()).toContain('Team');
  });

  it('labels transient task-agent instance tiles separately from logical members', () => {
    const taskAgentNode = {
      memberKind: 'agent',
      memberName: 'Worker task task-1',
      displayName: 'Worker task task-1',
      memberPath: ['worker', 'task-agent-run-1'],
      memberRouteKey: 'task-agent-run-1',
      memberRunId: 'task-agent-run-1',
      agentDefinitionId: 'worker-agent',
      isTaskAgentInstance: true,
      taskAgentInstanceId: 'task-agent-instance-1',
      taskAgentRunId: 'task-agent-run-1',
      taskId: 'task-1',
      logicalMemberRouteKey: 'worker',
    };
    const taskAgentContext = {
      ...buildMemberContext(),
      state: {
        currentStatus: AgentStatus.Running,
        conversation: {
          id: 'task-agent-run-1',
          createdAt: '2026-05-30T00:00:00.000Z',
          updatedAt: '2026-05-30T00:00:00.000Z',
          agentName: 'Worker task task-1',
          messages: [],
        },
      },
    };

    const wrapper = mount(TeamMemberMonitorTile, {
      props: {
        memberNode: taskAgentNode as any,
        memberContext: taskAgentContext as any,
        isFocused: true,
      },
    });

    expect(wrapper.text()).toContain('Worker task task-1');
    expect(wrapper.text()).toContain('Task agent');
    expect(wrapper.text()).toContain('Running');
    expect(wrapper.text()).not.toContain('Team');
  });

  it('labels logical parent members and does not preview task-agent work packets as parent conversation', () => {
    const workerNode = {
      memberKind: 'agent',
      memberName: 'worker',
      displayName: 'Worker',
      memberPath: ['worker'],
      memberRouteKey: 'worker',
      agentDefinitionId: 'worker-agent',
    };
    const workerContext = {
      ...buildMemberContext(),
      state: {
        currentStatus: AgentStatus.Offline,
        conversation: {
          id: 'team-1::worker',
          createdAt: '2026-05-30T00:00:00.000Z',
          updatedAt: '2026-05-30T00:00:00.000Z',
          agentName: 'Worker',
          messages: [{
            type: 'user',
            text: 'You have been activated as task agent task_agent_task_0001.\nTask-agent run: team-1__worker__task_0001',
            timestamp: new Date('2026-05-30T00:00:00.000Z'),
          }],
        },
      },
    };

    const wrapper = mount(TeamMemberMonitorTile, {
      props: {
        memberNode: workerNode as any,
        memberContext: workerContext as any,
      },
      global: {
        stubs: {
          AgentConversationFeed: {
            template: '<div data-test="conversation-feed" />',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Worker');
    expect(wrapper.text()).toContain('Member');
    expect(wrapper.find('[data-test="conversation-feed"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('No activity yet');
    expect(wrapper.text()).not.toContain('Task-agent run');
  });

  it('renders task-team badge, lifecycle timeline, and scoped child rows', () => {
    const scopedChildNode = {
      memberKind: 'agent',
      memberName: 'solution_designer',
      displayName: 'Solution Designer',
      memberPath: ['task-team-run-1', 'solution_designer'],
      memberRouteKey: 'task-team-run-1/solution_designer',
      memberRunId: null,
      agentDefinitionId: 'solution-def',
      isTaskTeamChildProjection: true,
      parentTaskTeamRunId: 'task-team-run-1',
      structuralSourceRouteKey: 'SoftwareEngineeringTeam/solution_designer',
    };
    const taskTeamNode = {
      memberKind: 'agent_team',
      memberName: 'Software Engineering Team · task_0001',
      displayName: 'Software Engineering Team · task_0001',
      memberPath: ['task-team-run-1'],
      memberRouteKey: 'task-team-run-1',
      memberRunId: 'task-team-run-1',
      teamDefinitionId: 'software-team',
      teamRunId: 'task-team-run-1',
      children: [scopedChildNode],
      isTaskTeamInstance: true,
      taskTeamRunId: 'task-team-run-1',
      taskId: 'task_0001',
      logicalTeamRouteKey: 'SoftwareEngineeringTeam',
      taskExecutionStatus: 'awaiting_review',
      currentStatus: AgentStatus.Running,
      taskTimeline: [
        { id: 'activated', label: 'Task team activated', status: 'active' },
        { id: 'submitted', label: 'Result submitted', status: 'awaiting_review' },
      ],
    };

    const wrapper = mount(TeamMemberMonitorTile, {
      props: {
        memberNode: taskTeamNode as any,
        memberContext: null,
        teamContext: {
          focusedMemberRouteKey: 'task-team-run-1',
          memberNodesByRouteKey: new Map<string, any>([
            ['task-team-run-1', taskTeamNode],
            ['task-team-run-1/solution_designer', scopedChildNode],
          ]),
          leafAgentContextsByRouteKey: new Map(),
        } as any,
      },
      global: {
        stubs: {
          AgentStatusDisplay: {
            props: ['status'],
            template: '<span data-test="team-member-status">{{ status }}</span>',
          },
          AgentConversationFeed: {
            template: '<div data-test="conversation-feed" />',
          },
        },
      },
    });

    expect(wrapper.find('[data-test="task-team-badge"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="task-team-lifecycle"]').text()).toContain('awaiting_review');
    expect(wrapper.get('[data-test="task-team-lifecycle"]').text()).toContain('Result submitted');
    expect(wrapper.text()).toContain('Solution Designer');
    expect(wrapper.text()).toContain('task-team-run-1/solution_designer');
    expect(wrapper.find('[data-test="conversation-feed"]').exists()).toBe(false);
  });

});
