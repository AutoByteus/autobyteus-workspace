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
});
