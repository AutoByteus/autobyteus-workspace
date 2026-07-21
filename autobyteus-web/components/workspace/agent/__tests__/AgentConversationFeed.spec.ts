import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
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

const defineFeedGeometry = (element: HTMLElement, scrollTop = 120) => {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: 1_000 },
    clientHeight: { configurable: true, value: 400 },
    offsetWidth: { configurable: true, value: 300 },
    clientWidth: { configurable: true, value: 280 },
    scrollTop: { configurable: true, writable: true, value: scrollTop },
  });
  element.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 400, width: 300, height: 400,
    toJSON: () => ({}),
  });
};

const dispatchTrusted = (
  element: HTMLElement,
  type: string,
  properties: Record<string, unknown> = {},
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isTrusted', { configurable: true, value: true });
  for (const [key, value] of Object.entries(properties)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  element.dispatchEvent(event);
};

const iconStub = { template: '<svg data-testid="stub-icon" />' };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const mockAnimationFramesWithTimers = () => {
  const implementation = (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16) as unknown as number;
  vi.stubGlobal('requestAnimationFrame', implementation);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(implementation);
};

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

  it('shows one compact non-visually-named jump action only for a post-baseline visible revision while non-pinned', async () => {
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
        stubs: { UserMessage: { template: '<div />' }, Icon: iconStub },
        mocks: { $t: () => 'Jump to latest activity' },
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
    const jump = wrapper.get('[data-testid="event-monitor-jump-to-latest"]');
    expect(jump.text()).toBe('');
    expect(jump.attributes('aria-label')).toBe('Jump to latest activity');
    expect(jump.attributes('title')).toBeUndefined();
    expect(jump.classes()).toEqual(expect.arrayContaining(['absolute', 'bottom-2', 'right-2', 'h-11', 'w-11']));
    expect(jump.get('span').classes()).toEqual(expect.arrayContaining(['h-9', 'w-9']));

    await jump.trigger('click');
    expect(wrapper.find('button').exists()).toBe(false);
    expect((feed.element as HTMLElement).scrollTop).toBe(1000);

    await wrapper.setProps({ presentationRevision: 0 });
    expect(wrapper.find('button').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps one native icon-only return action across every ordinary browse state', async () => {
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
          Icon: iconStub,
        },
        mocks: {
          $t: () => 'Jump to latest activity',
        },
      },
    });

    for (const state of ['browsing', 'beginning', 'error', 'loading'] as const) {
      await wrapper.setProps({ browseState: state });
      const exit = wrapper.get('[data-testid="event-monitor-jump-to-latest"]');
      expect(exit.element.tagName).toBe('BUTTON');
      expect(exit.attributes('type')).toBe('button');
      expect(exit.classes()).toContain('focus-visible:ring-2');
      expect(exit.text()).toBe('');
      expect(exit.attributes('aria-label')).toBe('Jump to latest activity');
      expect(exit.attributes('title')).toBeUndefined();
    }

    const exit = wrapper.get('[data-testid="event-monitor-jump-to-latest"]');
    (exit.element as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(exit.element);
    await exit.trigger('click');
    expect(wrapper.emitted('jump-to-latest')).toHaveLength(1);
    wrapper.unmount();
  });

  it('uses the same restrained arrow as the sole expired-state return control', async () => {
    const wrapper = mount(AgentConversationFeed, {
      props: {
        conversation: emptyConversation('run-expired-exit'),
        browseState: 'expired',
      },
      global: {
        stubs: { Icon: iconStub },
        mocks: {
          $t: () => 'Jump to latest activity',
        },
      },
    });

    expect(wrapper.find('[data-testid="event-monitor-expired-return"]').exists()).toBe(false);
    const recovery = wrapper.get('[data-testid="event-monitor-jump-to-latest"]');
    expect(recovery.text()).toBe('');
    expect(recovery.attributes('aria-label')).toBe('Jump to latest activity');
    expect(recovery.get('span').classes()).toEqual(expect.arrayContaining(['border-amber-300', 'text-amber-700']));
    expect(recovery.classes()).toContain('focus-visible:ring-2');
    await recovery.trigger('click');
    expect(wrapper.emitted('jump-to-latest')).toHaveLength(1);
  });

  it('renders zero-layout paging chrome with delayed dots, compact retry, and silent terminal states', async () => {
    vi.useFakeTimers();
    mockAnimationFramesWithTimers();
    const conversation = {
      ...emptyConversation('run-zero-layout'),
      messages: [{ type: 'user', text: 'first retained event', timestamp: new Date() }],
    } as any;
    const wrapper = mount(AgentConversationFeed, {
      props: { conversation, browseState: 'loading', canLoadEarlier: false },
      global: {
        stubs: { UserMessage: { template: '<div data-testid="first-event" />' }, Icon: iconStub },
        mocks: {
          $t: (key: string) => key.endsWith('retry_earlier') ? 'Retry' : 'Jump to latest activity',
        },
      },
    });
    const feed = wrapper.get('[data-testid="agent-conversation-feed"]');

    expect(feed.attributes('aria-busy')).toBe('true');
    expect(wrapper.find('[data-testid="event-monitor-loading-dots"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(149);
    expect(wrapper.find('[data-testid="event-monitor-loading-dots"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const dots = wrapper.get('[data-testid="event-monitor-loading-dots"]');
    expect(dots.findAll('span')).toHaveLength(3);
    expect(dots.text()).toBe('');
    expect(wrapper.get('[data-testid="event-monitor-top-overlay"]').classes()).toContain('absolute');
    expect(feed.element.firstElementChild?.classList.contains('rounded-xl')).toBe(true);

    await wrapper.setProps({ browseState: 'beginning' });
    expect(feed.attributes('aria-busy')).toBeUndefined();
    expect(wrapper.find('[data-testid="event-monitor-top-overlay"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Beginning');

    await wrapper.setProps({ browseState: 'error' });
    const retry = wrapper.get('[data-testid="event-monitor-retry-earlier"]');
    expect(retry.element.tagName).toBe('BUTTON');
    expect(retry.text()).toBe('');
    expect(retry.attributes('aria-label')).toBe('Retry');
    expect(retry.attributes('title')).toBeUndefined();
    expect(retry.classes()).toEqual(expect.arrayContaining(['h-11', 'w-11', 'focus-visible:ring-2']));
    await retry.trigger('click');
    expect(wrapper.emitted('load-earlier')).toHaveLength(1);
    wrapper.unmount();
  });

  it('requires a trusted direct wheel, touch, keyboard, or native-scrollbar session before a top request', async () => {
    vi.useFakeTimers();
    mockAnimationFramesWithTimers();
    const adapters = [
      (feed: HTMLElement) => dispatchTrusted(feed, 'wheel', { deltaY: -24 }),
      (feed: HTMLElement) => {
        dispatchTrusted(feed, 'touchstart', { touches: [{ clientY: 100 }] });
        dispatchTrusted(feed, 'touchmove', { touches: [{ clientY: 140 }] });
      },
      (feed: HTMLElement) => dispatchTrusted(feed, 'keydown', { key: 'PageUp', shiftKey: false }),
      (feed: HTMLElement) => dispatchTrusted(feed, 'pointerdown', { pointerId: 7, clientX: 295 }),
    ];

    for (const startDirectInput of adapters) {
      const wrapper = mount(AgentConversationFeed, {
        props: { conversation: emptyConversation(`run-input-${Math.random()}`), canLoadEarlier: true },
        global: { stubs: { Icon: iconStub }, mocks: { $t: (key: string) => key } },
      });
      const feed = wrapper.get('[data-testid="agent-conversation-feed"]').element as HTMLElement;
      defineFeedGeometry(feed);
      await nextTick();
      await vi.runAllTimersAsync();

      feed.scrollTop = 20;
      feed.dispatchEvent(new Event('scroll'));
      expect(wrapper.emitted('load-earlier')).toBeUndefined();

      feed.scrollTop = 120;
      startDirectInput(feed);
      feed.scrollTop = 20;
      feed.dispatchEvent(new Event('scroll'));
      expect(wrapper.emitted('load-earlier')).toHaveLength(1);

      feed.scrollTop = 10;
      feed.dispatchEvent(new Event('scroll'));
      expect(wrapper.emitted('load-earlier')).toHaveLength(1);
      wrapper.unmount();
    }
  });

  it('blocks queued scroll, anchor/layout changes, and continued near-top position until post-work quiet and fresh input', async () => {
    vi.useFakeTimers();
    mockAnimationFramesWithTimers();
    const wrapper = mount(AgentConversationFeed, {
      props: { conversation: emptyConversation('run-blocked-chain'), canLoadEarlier: true },
      global: {
        stubs: { EventMonitorBrowseAssistantRow: { template: '<div />' }, Icon: iconStub },
        mocks: { $t: (key: string) => key },
      },
    });
    const feed = wrapper.get('[data-testid="agent-conversation-feed"]').element as HTMLElement;
    defineFeedGeometry(feed);
    await nextTick();
    await vi.runAllTimersAsync();

    dispatchTrusted(feed, 'wheel', { deltaY: -20 });
    feed.scrollTop = 20;
    feed.dispatchEvent(new Event('scroll'));
    expect(wrapper.emitted('load-earlier')).toHaveLength(1);

    feed.scrollTop = 0;
    feed.dispatchEvent(new Event('scroll'));
    dispatchTrusted(feed, 'wheel', { deltaY: -20 });
    feed.scrollTop = 10;
    feed.dispatchEvent(new Event('scroll'));
    expect(wrapper.emitted('load-earlier')).toHaveLength(1);

    await wrapper.setProps({ browseState: 'loading' });
    await wrapper.setProps({
      browseState: 'browsing',
      browseItems: [browseAssistant([browseTextVisual('visual:anchor')])],
    });
    for (let step = 0; step < 3; step += 1) {
      await nextTick();
      await vi.runAllTimersAsync();
    }

    feed.scrollTop = 120;
    feed.dispatchEvent(new Event('scroll'));
    feed.scrollTop = 20;
    feed.dispatchEvent(new Event('scroll'));
    expect(wrapper.emitted('load-earlier')).toHaveLength(1);

    feed.scrollTop = 120;
    dispatchTrusted(feed, 'wheel', { deltaY: -20 });
    feed.scrollTop = 20;
    feed.dispatchEvent(new Event('scroll'));
    expect(wrapper.emitted('load-earlier')).toHaveLength(2);
    wrapper.unmount();
  });

  it('expires a continuous direct-input session and requires its idle boundary before fresh authority', async () => {
    vi.useFakeTimers();
    mockAnimationFramesWithTimers();
    const wrapper = mount(AgentConversationFeed, {
      props: { conversation: emptyConversation('run-max-intent'), canLoadEarlier: true },
      global: { stubs: { Icon: iconStub }, mocks: { $t: (key: string) => key } },
    });
    const feed = wrapper.get('[data-testid="agent-conversation-feed"]').element as HTMLElement;
    defineFeedGeometry(feed);
    await nextTick();
    await vi.runAllTimersAsync();

    for (let sample = 0; sample < 51; sample += 1) {
      dispatchTrusted(feed, 'wheel', { deltaY: -1 });
      await vi.advanceTimersByTimeAsync(100);
    }
    dispatchTrusted(feed, 'wheel', { deltaY: -1 });
    feed.scrollTop = 20;
    feed.dispatchEvent(new Event('scroll'));
    expect(wrapper.emitted('load-earlier')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(251);
    feed.scrollTop = 120;
    dispatchTrusted(feed, 'wheel', { deltaY: -1 });
    feed.scrollTop = 20;
    feed.dispatchEvent(new Event('scroll'));
    expect(wrapper.emitted('load-earlier')).toHaveLength(1);
    wrapper.unmount();
  });

  it('clears unseen on manual bottom only in latest mode and preserves frozen browse until arrow activation', async () => {
    const wrapper = mount(AgentConversationFeed, {
      props: { conversation: emptyConversation('run-manual-bottom'), presentationRevision: 0 },
      attachTo: document.body,
      global: {
        stubs: { EventMonitorBrowseAssistantRow: { template: '<div />' }, Icon: iconStub },
        mocks: { $t: () => 'Jump to latest activity' },
      },
    });
    const feed = wrapper.get('[data-testid="agent-conversation-feed"]').element as HTMLElement;
    defineFeedGeometry(feed, 100);
    feed.dispatchEvent(new Event('scroll'));
    await wrapper.setProps({ presentationRevision: 1 });
    expect(wrapper.find('[data-testid="event-monitor-jump-to-latest"]').exists()).toBe(true);

    feed.scrollTop = 600;
    feed.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(wrapper.find('[data-testid="event-monitor-jump-to-latest"]').exists()).toBe(false);

    await wrapper.setProps({
      browseState: 'browsing',
      browseItems: [browseAssistant([browseTextVisual('visual:frozen')])],
    });
    feed.scrollTop = 600;
    feed.dispatchEvent(new Event('scroll'));
    await nextTick();
    const arrow = wrapper.get('[data-testid="event-monitor-jump-to-latest"]');
    expect(wrapper.emitted('jump-to-latest')).toBeUndefined();
    await arrow.trigger('click');
    expect(wrapper.emitted('jump-to-latest')).toHaveLength(1);
    wrapper.unmount();
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
