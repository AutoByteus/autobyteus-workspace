import { nextTick, reactive, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunActivity } from '~/types/activity/RunActivity';

const highlightedId = ref<string | null>(null);
const activities = ref<RunActivity[]>([]);
const activeTeamContext = ref<any>(null);
const authoritative = ref(false);
const activeContextStoreMock = reactive({
  activeAgentContext: {
    config: { runtimeKind: 'autobyteus' },
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
vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({ get activeTeamContext() { return activeTeamContext.value; } }),
}));
vi.mock('~/services/runHydration/teamMemberProjectionHydrationService', () => ({
  isTeamMemberProjectionAuthoritative: () => authoritative.value,
}));

import ActivityFeed from '../ActivityFeed.vue';

describe('ActivityFeed', () => {
  beforeEach(() => {
    highlightedId.value = null;
    activeTeamContext.value = null;
    authoritative.value = false;
    activities.value = [
      {
        kind: 'tool',
        activityId: 'tool-1',
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
        kind: 'tool',
        activityId: 'tool-2',
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

  it('keeps a dedicated visible scroll container for the activity list', () => {
    const wrapper = mount(ActivityFeed, {
      global: {
        stubs: {
          ToolActivityItem: {
            name: 'ToolActivityItem',
            props: ['activity', 'isHighlighted'],
            template: '<div class="activity-item-stub" :data-id="activity.invocationId">{{ activity.invocationId }}</div>',
          },
        },
      },
    });

    const feed = wrapper.get('[data-test="activity-feed-scroll-container"]');
    expect(feed.classes()).toContain('overflow-y-scroll');
    expect(feed.classes()).toContain('custom-scrollbar');

    wrapper.unmount();
  });

  it('scrolls the feed container directly when a highlighted activity is revealed', async () => {
    const wrapper = mount(ActivityFeed, {
      attachTo: document.body,
      global: {
        stubs: {
          ToolActivityItem: {
            name: 'ToolActivityItem',
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

    feedEl.scrollTo = scrollToSpy as any;
    targetEl.scrollIntoView = scrollIntoViewSpy;

    highlightedId.value = 'tool-2';
    await nextTick();
    await nextTick();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 110, behavior: 'smooth' });
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('renders tool and compaction activities in the same general Activity feed', () => {
    activities.value = [
      activities.value[0],
      {
        kind: 'compaction',
        activityId: 'compaction:provider:codex:session-1:operation-1:turn-1',
        phase: 'completed',
        message: 'Provider context compaction boundary recorded',
        provider: 'codex',
        turnId: 'turn-1',
        timestamp: new Date('2026-03-08T00:00:02.000Z'),
        updatedAt: new Date('2026-03-08T00:00:03.000Z'),
      },
    ].filter(Boolean) as RunActivity[];

    const wrapper = mount(ActivityFeed, {
      global: {
        stubs: {
          ToolActivityItem: {
            name: 'ToolActivityItem',
            props: ['activity', 'isHighlighted'],
            template: '<div data-kind="tool">{{ activity.toolName }}</div>',
          },
          CompactionActivityItem: {
            name: 'CompactionActivityItem',
            props: ['activity', 'isHighlighted'],
            template: '<div data-kind="compaction">{{ activity.message }}</div>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('2 Events');
    expect(wrapper.findAll('[data-kind]').map((node) => node.attributes('data-kind'))).toEqual([
      'tool',
      'compaction',
    ]);
    expect(wrapper.text()).toContain('Provider context compaction boundary recorded');
    expect(wrapper.findAll('[data-test="activity-feed-scroll-container"]')).toHaveLength(1);

    wrapper.unmount();
  });

  it('uses exact task true-empty wording only after projection authority is established', () => {
    activities.value = [];
    authoritative.value = true;
    activeTeamContext.value = {
      view: {
        getFocusedNavigationRow: () => ({ agentRunId: 'run-1', task: { taskId: 'task-1' } }),
      },
    };

    const wrapper = mount(ActivityFeed, {
      global: { mocks: { $t: (key: string) => key === 'workspace.task_monitor.empty'
        ? 'No activity recorded for this task yet.' : key } },
    });

    expect(wrapper.text()).toContain('No activity recorded for this task yet.');
  });
});
