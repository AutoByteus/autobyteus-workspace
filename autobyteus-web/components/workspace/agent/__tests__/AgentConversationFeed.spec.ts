import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentConversationFeed from '../AgentConversationFeed.vue';

describe('AgentConversationFeed', () => {
  it('renders canonical user and ai message components in order', () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: {
          id: 'team-1::professor',
          createdAt: '2026-03-07T00:00:00.000Z',
          updatedAt: '2026-03-07T00:00:00.000Z',
          agentName: 'Professor',
          messages: [
            {
              type: 'user',
              text: 'cool. did you get answer?',
              timestamp: new Date('2026-03-07T00:00:00.000Z'),
            },
            {
              type: 'ai',
              text: '',
              timestamp: new Date('2026-03-07T00:00:01.000Z'),
              isComplete: false,
              segments: [
                {
                  type: 'text',
                  content: 'Based on the tool execution I have enough information to respond.',
                },
              ],
            },
          ],
        } as any,
        agentName: 'Professor',
      },
      global: {
        stubs: {
          UserMessage: {
            props: ['message'],
            template: '<div data-test="user-message">{{ message.text }}</div>',
          },
          AIMessage: {
            props: ['message'],
            template: '<div data-test="ai-message">{{ message.segments[0].content }}</div>',
          },
        },
      },
    });

    const renderedMessages = wrapper.findAll('[data-test]');
    expect(renderedMessages).toHaveLength(2);
    expect(renderedMessages[0].attributes('data-test')).toBe('user-message');
    expect(renderedMessages[1].attributes('data-test')).toBe('ai-message');
    expect(wrapper.text()).toContain('cool. did you get answer?');
    expect(wrapper.text()).toContain('Based on the tool execution I have enough information to respond.');
    expect(wrapper.get('[data-testid="agent-conversation-feed"]').classes()).toEqual(expect.arrayContaining([
      'h-full',
      'min-h-0',
      'overflow-y-auto',
    ]));
  });

  it('passes explicit run id to AI messages when it differs from conversation id', () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        runId: 'member-run-1',
        conversation: {
          id: 'team-run-1::professor',
          createdAt: '2026-03-07T00:00:00.000Z',
          updatedAt: '2026-03-07T00:00:00.000Z',
          messages: [
            {
              type: 'ai',
              text: '',
              timestamp: new Date('2026-03-07T00:00:01.000Z'),
              isComplete: true,
              segments: [{ type: 'text', content: 'hi' }],
            },
          ],
        } as any,
      },
      global: {
        stubs: {
          AIMessage: {
            props: ['runId'],
            template: '<div data-test="ai-message">{{ runId }}</div>',
          },
        },
      },
    });

    expect(wrapper.get('[data-test="ai-message"]').text()).toBe('member-run-1');
  });

  it('can hide token-cost and total-usage metadata for smaller tiles', () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: {
          id: 'team-1::professor',
          createdAt: '2026-03-07T00:00:00.000Z',
          updatedAt: '2026-03-07T00:00:00.000Z',
          agentName: 'Professor',
          messages: [
            {
              type: 'user',
              text: 'hello',
              timestamp: new Date('2026-03-07T00:00:00.000Z'),
              promptTokens: 12,
              promptCost: 0.0012,
            },
            {
              type: 'ai',
              text: '',
              timestamp: new Date('2026-03-07T00:00:01.000Z'),
              isComplete: true,
              completionTokens: 24,
              completionCost: 0.0034,
              segments: [
                { type: 'text', content: 'hi' },
              ],
            },
          ],
        } as any,
        showTokenCosts: false,
        showTotalUsage: false,
      },
      global: {
        stubs: {
          UserMessage: { template: '<div />' },
          AIMessage: { template: '<div />' },
        },
      },
    });

    expect(wrapper.text()).not.toContain('tokens / $');
    expect(wrapper.text()).not.toContain('Total:');
  });

  it('renders compaction status rows inside the conversation feed by timestamp', () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: {
          id: 'run-1',
          createdAt: '2026-03-07T00:00:00.000Z',
          updatedAt: '2026-03-07T00:00:00.000Z',
          messages: [
            {
              type: 'user',
              text: 'before',
              timestamp: new Date('2026-03-07T00:00:00.000Z'),
            },
            {
              type: 'ai',
              text: '',
              timestamp: new Date('2026-03-07T00:00:02.000Z'),
              isComplete: true,
              segments: [{ type: 'text', content: 'after' }],
            },
          ],
        } as any,
        compactionActivities: [
          {
            kind: 'compaction',
            activityId: 'compaction:task:1',
            phase: 'completed',
            message: 'Memory compacted',
            timestamp: new Date('2026-03-07T00:00:01.000Z'),
            updatedAt: new Date('2026-03-07T00:00:01.000Z'),
          },
        ],
      },
      global: {
        stubs: {
          UserMessage: {
            props: ['message'],
            template: '<div data-test="user-message">{{ message.text }}</div>',
          },
          AIMessage: {
            props: ['message'],
            template: '<div data-test="ai-message">{{ message.segments[0].content }}</div>',
          },
          CompactionStatusRow: {
            props: ['activity'],
            template: '<div data-test="compaction-row">{{ activity.message }}</div>',
          },
        },
      },
    });

    expect(wrapper.findAll('[data-test]').map((node) => node.attributes('data-test'))).toEqual([
      'user-message',
      'compaction-row',
      'ai-message',
    ]);
  });

});
