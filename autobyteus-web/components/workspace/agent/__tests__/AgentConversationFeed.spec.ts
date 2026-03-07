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
});
