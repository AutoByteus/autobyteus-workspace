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

});
