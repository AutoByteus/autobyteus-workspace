import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import type { Conversation } from '~/types/conversation';

const conversation: Conversation = {
  id: 'agent-42',
  createdAt: '2026-02-10T00:00:00.000Z',
  updatedAt: '2026-02-10T00:00:30.000Z',
  messages: [
    {
      type: 'user',
      text: 'Please write a summary.',
      timestamp: new Date('2026-02-10T00:00:01.000Z'),
      promptTokens: 10,
      promptCost: 0.1,
    },
    {
      type: 'ai',
      text: 'Sure, here is the summary.',
      timestamp: new Date('2026-02-10T00:00:02.000Z'),
      segments: [],
      isComplete: true,
      completionTokens: 20,
      completionCost: 0.2,
    },
  ],
};

describe('AgentEventMonitor.vue', () => {
  it('passes the conversation context into AgentConversationFeed and renders the input form', () => {
    const wrapper = mount(AgentEventMonitor, {
      props: {
        conversation,
        agentName: 'Slide Narrator',
        agentAvatarUrl: 'https://example.com/slide-narrator.png',
        interAgentSenderNameById: {
          'member-1': 'Professor',
        },
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div data-testid="agent-input-stub" />' },
          AgentConversationFeed: {
            name: 'AgentConversationFeed',
            props: ['conversation', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById'],
            template: '<div data-testid="agent-feed-stub" />',
          },
          CompactionStatusBanner: {
            name: 'CompactionStatusBanner',
            props: ['status'],
            template: '<div data-testid="compaction-banner-stub" />',
          },
        },
      },
    });

    const feed = wrapper.findComponent({ name: 'AgentConversationFeed' });
    expect(feed.exists()).toBe(true);
    expect(feed.props('conversation')).toEqual(conversation);
    expect(feed.props('agentName')).toBe('Slide Narrator');
    expect(feed.props('agentAvatarUrl')).toBe('https://example.com/slide-narrator.png');
    expect(feed.props('interAgentSenderNameById')).toEqual({ 'member-1': 'Professor' });
    expect(wrapper.find('[data-testid="agent-input-stub"]').exists()).toBe(true);
  });

  it('forwards compaction status into the banner component', () => {
    const wrapper = mount(AgentEventMonitor, {
      props: {
        conversation,
        compactionStatus: {
          phase: 'started',
          message: 'Compacting memory…',
          turnId: 'turn-1',
        },
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div data-testid="agent-input-stub" />' },
          AgentConversationFeed: { template: '<div data-testid="agent-feed-stub" />' },
          CompactionStatusBanner: {
            name: 'CompactionStatusBanner',
            props: ['status'],
            template: '<div data-testid="compaction-banner-stub" />',
          },
        },
      },
    });

    const banner = wrapper.findComponent({ name: 'CompactionStatusBanner' });
    expect(banner.exists()).toBe(true);
    expect(banner.props('status')).toEqual({
      phase: 'started',
      message: 'Compacting memory…',
      turnId: 'turn-1',
    });
  });
});
