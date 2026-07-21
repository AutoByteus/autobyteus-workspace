import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import type { Conversation } from '~/types/conversation';

const compactionActivityRows = [
  {
    kind: 'compaction',
    activityId: 'compaction:task:1',
    phase: 'started',
    message: 'Compacting memory…',
    timestamp: new Date('2026-02-10T00:00:03.000Z'),
    updatedAt: new Date('2026-02-10T00:00:03.000Z'),
  },
];
const compactionActivities = vi.fn((_runId: string) => compactionActivityRows);

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({
    getCompactionActivities: compactionActivities,
  }),
}));

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
  beforeEach(() => {
    compactionActivities.mockClear();
  });

  it('passes the conversation context and compaction activities into AgentConversationFeed', () => {
    const wrapper = mount(AgentEventMonitor, {
      props: {
        conversation,
        agentName: 'Slide Narrator',
        agentAvatarUrl: 'https://example.com/slide-narrator.png',
        interAgentSenderNameById: {
          'member-1': 'Professor',
        },
        presentationRevision: 7,
        browseSubject: { kind: 'run', runId: 'agent-42' },
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div data-testid="agent-input-stub" />' },
          AgentConversationFeed: {
            name: 'AgentConversationFeed',
            props: ['conversation', 'runId', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById', 'compactionActivities', 'presentationRevision', 'enableEventMonitorFileActions'],
            template: '<div data-testid="agent-feed-stub" />',
          },
        },
      },
    });

    const feed = wrapper.findComponent({ name: 'AgentConversationFeed' });
    expect(feed.exists()).toBe(true);
    expect(feed.props('conversation')).toEqual(conversation);
    expect(feed.props('runId')).toBe('agent-42');
    expect(feed.props('agentName')).toBe('Slide Narrator');
    expect(feed.props('agentAvatarUrl')).toBe('https://example.com/slide-narrator.png');
    expect(feed.props('interAgentSenderNameById')).toEqual({ 'member-1': 'Professor' });
    expect(feed.props('compactionActivities')).toEqual(compactionActivityRows);
    expect(feed.props('presentationRevision')).toBe(7);
    expect(feed.props('enableEventMonitorFileActions')).toBe(true);
    expect(compactionActivities).toHaveBeenCalledWith('agent-42');
    expect(wrapper.find('[data-testid="agent-input-stub"]').exists()).toBe(true);
  });

  it('uses explicit run identity for compaction activities when conversation id differs', () => {
    const wrapper = mount(AgentEventMonitor, {
      props: {
        conversation: {
          ...conversation,
          id: 'team-run-1::Professor',
        },
        runId: 'member-run-1',
        browseSubject: { kind: 'teamMember', teamRunId: 'team-run-1', memberRouteKey: 'Professor', agentRunId: 'member-run-1' },
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div data-testid="agent-input-stub" />' },
          AgentConversationFeed: {
            name: 'AgentConversationFeed',
            props: ['conversation', 'runId', 'compactionActivities'],
            template: '<div data-testid="agent-feed-stub" />',
          },
        },
      },
    });

    const feed = wrapper.findComponent({ name: 'AgentConversationFeed' });
    expect(feed.props('runId')).toBe('member-run-1');
    expect(feed.props('compactionActivities')).toEqual(compactionActivityRows);
    expect(compactionActivities).toHaveBeenCalledWith('member-run-1');
    expect(compactionActivities).not.toHaveBeenCalledWith('team-run-1::Professor');
  });

  it('keeps the shared monitor as a bounded flex column for mobile and desktop shells', () => {
    const wrapper = mount(AgentEventMonitor, {
      props: { conversation, browseSubject: { kind: 'run', runId: 'agent-42' } },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div data-testid="agent-input-stub" />' },
          AgentConversationFeed: { template: '<div data-testid="agent-feed-stub" />' },
        },
      },
    });

    expect(wrapper.get('[data-testid="agent-event-monitor"]').classes()).toEqual(expect.arrayContaining([
      'h-full',
      'min-h-0',
      'flex-col',
      'overflow-hidden',
    ]));
  });
});
