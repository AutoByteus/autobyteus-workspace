import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import AgentConversationFeed from '../AgentConversationFeed.vue';
import type { EventMonitorBrowseAssistantVisual } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';

const emptyConversation = (id: string) => ({
  id,
  createdAt: '2026-03-07T00:00:00.000Z',
  updatedAt: '2026-03-07T00:00:00.000Z',
  messages: [],
}) as any;

const browseTextVisual = (visualId: string, content = 'Done') => ({
  kind: 'text' as const,
  visualId,
  content,
});

const browseThinkingVisual = (visualId: string, content = 'Thinking') => ({
  kind: 'thinking' as const,
  visualId,
  content,
});

const browseAssistant = (visuals: EventMonitorBrowseAssistantVisual[]) => ({
  kind: 'assistant' as const,
  key: 'browse-assistant-group:turn-1',
  turnGroupId: 'turn-1',
  visuals,
});

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

  it('forwards explicit Event Monitor file actions without bypassing the recent presentation feed', async () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        enableEventMonitorFileActions: true,
        conversation: {
          id: 'run-file-action',
          createdAt: '2026-03-07T00:00:00.000Z',
          updatedAt: '2026-03-07T00:00:01.000Z',
          messages: [{
            type: 'ai',
            text: '',
            timestamp: new Date('2026-03-07T00:00:01.000Z'),
            isComplete: true,
            segments: [{ type: 'text', content: 'Open /tmp/report.md' }],
          }],
        } as any,
      },
      global: {
        stubs: {
          AIMessage: {
            name: 'AIMessage',
            props: ['enableEventMonitorFileActions'],
            emits: ['file-path-action'],
            template: '<div data-test="ai-message" />',
          },
        },
      },
    });
    const aiMessage = wrapper.findComponent({ name: 'AIMessage' });
    const action = { normalizedCandidate: '/tmp/report.md' } as any;

    expect(aiMessage.props('enableEventMonitorFileActions')).toBe(true);
    aiMessage.vm.$emit('file-path-action', action);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('file-path-action')).toEqual([[action]]);
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
            centerTimelineTimestamp: new Date('2026-03-07T00:00:01.000Z'),
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

  it('hides requested compaction rows and orders execution rows by center timeline timestamp', () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: {
          id: 'run-2',
          createdAt: '2026-03-07T00:00:00.000Z',
          updatedAt: '2026-03-07T00:00:05.000Z',
          messages: [
            {
              type: 'ai',
              text: '',
              timestamp: new Date('2026-03-07T00:00:02.000Z'),
              isComplete: true,
              segments: [{ type: 'text', content: 'tool result visible first' }],
            },
            {
              type: 'ai',
              text: '',
              timestamp: new Date('2026-03-07T00:00:04.000Z'),
              isComplete: false,
              segments: [{ type: 'text', content: 'post-compaction continuation' }],
            },
          ],
        } as any,
        compactionActivities: [
          {
            kind: 'compaction',
            activityId: 'compaction:operation:queued',
            phase: 'requested',
            message: 'Compaction queued',
            timestamp: new Date('2026-03-07T00:00:01.000Z'),
            updatedAt: new Date('2026-03-07T00:00:01.000Z'),
            centerTimelineTimestamp: null,
          },
          {
            kind: 'compaction',
            activityId: 'compaction:operation:executing',
            phase: 'completed',
            message: 'Memory compacted',
            timestamp: new Date('2026-03-07T00:00:00.000Z'),
            updatedAt: new Date('2026-03-07T00:00:03.000Z'),
            centerTimelineTimestamp: new Date('2026-03-07T00:00:03.000Z'),
          },
        ],
      },
      global: {
        stubs: {
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

    expect(wrapper.findAll('[data-test]').map((node) => node.text())).toEqual([
      'tool result visible first',
      'Memory compacted',
      'post-compaction continuation',
    ]);
    expect(wrapper.text()).not.toContain('Compaction queued');
  });

  it('shows a keyboard-native jump action only for a post-baseline visible revision while non-pinned', async () => {
    const conversation = {
      id: 'run-scroll',
      createdAt: '2026-03-07T00:00:00.000Z',
      updatedAt: '2026-03-07T00:00:00.000Z',
      messages: [{ type: 'user', text: 'first', timestamp: new Date() }],
    } as any;
    const wrapper = mount(AgentConversationFeed, {
      props: { conversation, presentationRevision: 0 },
      attachTo: document.body,
      global: {
        stubs: { UserMessage: { template: '<div />' } },
        mocks: { $t: () => 'New activity · Jump to latest' },
      },
    });
    const feed = wrapper.get('[data-testid="agent-conversation-feed"]');
    Object.defineProperties(feed.element, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });
    await feed.trigger('scroll');

    await wrapper.setProps({ presentationRevision: 1 });
    const jump = wrapper.get('button');
    expect(jump.text()).toBe('New activity · Jump to latest');

    await jump.trigger('click');
    expect(wrapper.find('button').exists()).toBe(false);
    expect((feed.element as HTMLElement).scrollTop).toBe(1000);

    await wrapper.setProps({ presentationRevision: 0 });
    expect(wrapper.find('button').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps an explicit keyboard-operable return to latest across every ordinary browse state', async () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: emptyConversation('run-browse-exit'),
        browseState: 'browsing',
        browseItems: [browseAssistant([browseTextVisual('visual:retained')])],
      },
      attachTo: document.body,
      global: {
        stubs: {
          EventMonitorBrowseAssistantRow: { template: '<div />' },
        },
        mocks: {
          $t: (key: string) => key.endsWith('return_to_latest') ? 'Return to latest' : key,
        },
      },
    });

    for (const state of ['browsing', 'beginning', 'error', 'loading'] as const) {
      await wrapper.setProps({ browseState: state });
      const exit = wrapper.get('[data-testid="event-monitor-jump-to-latest"]');
      expect(exit.element.tagName).toBe('BUTTON');
      expect(exit.attributes('type')).toBe('button');
      expect(exit.classes()).toContain('focus-visible:ring-2');
      expect(exit.text()).toBe('Return to latest');
    }

    const exit = wrapper.get('[data-testid="event-monitor-jump-to-latest"]');
    (exit.element as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(exit.element);
    await exit.trigger('click');
    await exit.trigger('keydown', { key: 'Enter' });
    await exit.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('jump-to-latest')).toHaveLength(3);
    wrapper.unmount();
  });

  it('uses the expiry recovery as the sole return control and supports keyboard activation', async () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: emptyConversation('run-expired-exit'),
        browseState: 'expired',
      },
      global: {
        mocks: {
          $t: (key: string) => key.endsWith('earlier_cursor_expired') ? 'History changed · Return to latest' : key,
        },
      },
    });

    expect(wrapper.find('[data-testid="event-monitor-jump-to-latest"]').exists()).toBe(false);
    const recovery = wrapper.get('[data-testid="event-monitor-expired-return"]');
    expect(recovery.text()).toBe('History changed · Return to latest');
    expect(recovery.classes()).toContain('focus-visible:ring-2');
    await recovery.trigger('click');
    await recovery.trigger('keydown', { key: 'Enter' });
    await recovery.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('jump-to-latest')).toHaveLength(3);
  });

  it('preserves retained disclosure component identity across same-turn prepend and newer turnover', async () => {
    const StatefulThinkSegment = defineComponent({
      props: { content: { type: String, required: true } },
      data: () => ({ open: false }),
      render() {
        return h('button', {
          type: 'button',
          'data-testid': 'browse-thinking-disclosure',
          onClick: () => { this.open = !this.open; },
        }, `${this.content}:${this.open ? 'open' : 'closed'}`);
      },
    });
    const retained = browseThinkingVisual('visual:retained', 'Equal thinking');
    const newer = browseThinkingVisual('visual:newer', 'Equal thinking');
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: emptyConversation('run-disclosure'),
        browseState: 'browsing',
        browseItems: [browseAssistant([retained, newer])],
      },
      global: {
        stubs: {
          ThinkSegment: StatefulThinkSegment,
          TextSegment: true,
          ToolCallIndicator: true,
          MediaSegment: true,
        },
        mocks: { $t: (key: string) => key },
      },
    });

    const retainedContainer = wrapper.get('[data-event-monitor-visual-key="visual:retained"]');
    const retainedDisclosure = retainedContainer.get('[data-testid="browse-thinking-disclosure"]');
    await retainedDisclosure.trigger('click');
    expect(retainedDisclosure.text()).toContain('open');

    const earlier = browseThinkingVisual('visual:earlier', 'Equal thinking');
    await wrapper.setProps({ browseItems: [browseAssistant([earlier, retained, newer])] });
    const afterPrepend = wrapper.get('[data-event-monitor-visual-key="visual:retained"]')
      .get('[data-testid="browse-thinking-disclosure"]');
    expect(afterPrepend.element).toBe(retainedDisclosure.element);
    expect(afterPrepend.text()).toContain('open');
    expect(wrapper.findAll('[data-testid="browse-thinking-disclosure"]')).toHaveLength(3);

    await wrapper.setProps({ browseItems: [browseAssistant([earlier, retained])] });
    const afterTurnover = wrapper.get('[data-event-monitor-visual-key="visual:retained"]')
      .get('[data-testid="browse-thinking-disclosure"]');
    expect(afterTurnover.element).toBe(retainedDisclosure.element);
    expect(afterTurnover.text()).toContain('open');
    expect(wrapper.find('[data-event-monitor-visual-key="visual:newer"]').exists()).toBe(false);
  });

});
