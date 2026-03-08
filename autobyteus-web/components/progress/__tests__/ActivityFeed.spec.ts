import { nextTick, reactive, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolActivity } from '~/stores/agentActivityStore';

const highlightedId = ref<string | null>(null);
const activities = ref<ToolActivity[]>([]);
const activeContextStoreMock = reactive({
  activeAgentContext: {
    state: {
      runId: 'run-1',
    },
  },
});

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({
    getActivities: () => activities.value,
    getHighlightedActivityId: () => highlightedId.value,
  }),
}));

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => activeContextStoreMock,
}));

import ActivityFeed from '../ActivityFeed.vue';

describe('ActivityFeed', () => {
  beforeEach(() => {
    highlightedId.value = null;
    activities.value = [
      {
        invocationId: 'tool-1',
        toolName: 'WebSearch',
        type: 'tool_call',
        status: 'success',
        contextText: '',
        arguments: {},
        logs: [],
        result: null,
        error: null,
        timestamp: new Date('2026-03-08T00:00:00.000Z'),
      },
      {
        invocationId: 'tool-2',
        toolName: 'WebSearch',
        type: 'tool_call',
        status: 'success',
        contextText: '',
        arguments: {},
        logs: [],
        result: null,
        error: null,
        timestamp: new Date('2026-03-08T00:00:01.000Z'),
      },
    ];
  });

  it('scrolls the feed container directly when a highlighted activity is revealed', async () => {
    const wrapper = mount(ActivityFeed, {
      attachTo: document.body,
      global: {
        stubs: {
          ActivityItem: {
            name: 'ActivityItem',
            props: ['activity', 'isHighlighted'],
            template: '<div class="activity-item-stub" :data-id="activity.invocationId">{{ activity.invocationId }}</div>',
          },
        },
      },
    });

    const feed = wrapper.get('[data-test="activity-feed-scroll-container"]');
    const feedEl = feed.element as HTMLElement & {
      scrollTo?: (options: { top: number; behavior?: ScrollBehavior }) => void;
    };
    const items = wrapper.findAll('.activity-item-stub');
    const targetEl = items[1].element as HTMLElement & { scrollIntoView?: () => void };

    let scrollTopValue = 40;
    const scrollToSpy = vi.fn((options: { top: number }) => {
      scrollTopValue = options.top;
    });
    const scrollIntoViewSpy = vi.fn();

    Object.defineProperty(feedEl, 'clientHeight', { value: 300, configurable: true });
    Object.defineProperty(feedEl, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });
    Object.defineProperty(feedEl, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 100,
        left: 0,
        right: 300,
        bottom: 400,
        width: 300,
        height: 300,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(targetEl, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 280,
        left: 0,
        right: 300,
        bottom: 360,
        width: 300,
        height: 80,
        x: 0,
        y: 280,
        toJSON: () => ({}),
      }),
    });

    feedEl.scrollTo = scrollToSpy;
    targetEl.scrollIntoView = scrollIntoViewSpy;

    highlightedId.value = 'tool-2';
    await nextTick();
    await nextTick();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 110, behavior: 'smooth' });
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
