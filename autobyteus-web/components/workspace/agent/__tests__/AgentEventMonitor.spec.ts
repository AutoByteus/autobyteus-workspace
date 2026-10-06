import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import { WORKSPACE_TOOL_REVEAL_KEY } from '~/composables/layout/useWorkspaceToolReveal';
import type { Conversation } from '~/types/conversation';

enableAutoUnmount(afterEach);
const launcher = vi.hoisted(() => ({ create: vi.fn(), open: vi.fn() }));
vi.mock('~/composables/useEventMonitorFilePreview', () => ({
  useEventMonitorFilePreview: launcher.create,
}));
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

it('retains the exact historical conversation while removing all composer slots for a read-only execution', async () => {
  const wrapper = mount(AgentEventMonitor, {
    props: { conversation, readOnly: true, browseSubject: { kind: 'agentOrgMember', orgRunId: 'org-run', agentRunId: 'task-run', memberAddress: '/worker' } },
    slots: { composerContext: '<button data-test="composer-action">Compose</button>' },
    global: { stubs: {
      AgentUserInputForm: { template: '<textarea data-test="composer" />' },
      AgentConversationFeed: { props: ['conversation'], template: '<article>{{ conversation.messages[0].text }}</article>' },
    } },
  });
  expect(wrapper.text()).toContain('Please write a summary.');
  expect(wrapper.find('[data-test="composer"]').exists()).toBe(false);
  expect(wrapper.find('[data-test="composer-action"]').exists()).toBe(false);
  await wrapper.setProps({ readOnly: false });
  expect(wrapper.find('[data-test="composer"]').exists()).toBe(true);
});


describe('setup-bound lazy file activation', () => {
  const action = { normalizedCandidate: '/owned/B/brief.md' };
  const mountMonitor = (revealTool?: any) => mount(AgentEventMonitor, {
    props: { conversation, browseSubject: { kind: 'run', runId: 'agent-42' } },
    global: {
      provide: revealTool ? { [WORKSPACE_TOOL_REVEAL_KEY as symbol]: revealTool } : {},
      stubs: {
        AgentUserInputForm: true, CollaboratorAddFailureNotice: true,
        AgentConversationFeed: { name: 'AgentConversationFeed', template: '<div />', emits: ['file-path-action'] },
      },
    },
  });
  beforeEach(() => {
    launcher.create.mockReset().mockImplementation(() => ({ openPath: launcher.open }));
    launcher.open.mockReset().mockResolvedValue({ status: 'failed', message: 'ordinary failure' });
  });
  it('captures the exact local capability in setup, remains passive, then passes it to the lazy launcher', async () => {
    const reveal = vi.fn();
    const wrapper = mountMonitor(reveal);
    await flushPromises();
    expect(launcher.create).not.toHaveBeenCalled(); expect(reveal).not.toHaveBeenCalled();
    wrapper.getComponent({ name: 'AgentConversationFeed' }).vm.$emit('file-path-action', action);
    await flushPromises();
    const options = launcher.create.mock.calls[0][0];
    expect(options.revealTool).toBe(reveal); expect(options.isOriginCurrent()).toBe(true);
    expect(launcher.open).toHaveBeenCalledWith(action);
    expect(wrapper.get('[data-testid="event-monitor-file-preview-status"]').text()).toBe('ordinary failure');
    wrapper.unmount(); expect(options.isOriginCurrent()).toBe(false);
  });
  it('passes a null capability for the mobile/no-provider monitor, without setup effects', async () => {
    const wrapper = mountMonitor();
    expect(launcher.create).not.toHaveBeenCalled();
    wrapper.getComponent({ name: 'AgentConversationFeed' }).vm.$emit('file-path-action', action);
    await flushPromises(); expect(launcher.create.mock.calls[0][0].revealTool).toBeNull();
  });
  for (const invalidation of ['run-switch', 'unmount'] as const) {
    it(`does not invoke after ${invalidation} during lazy import`, async () => {
      const wrapper = mountMonitor(vi.fn());
      wrapper.getComponent({ name: 'AgentConversationFeed' }).vm.$emit('file-path-action', action);
      if (invalidation === 'unmount') wrapper.unmount();
      else await wrapper.setProps({ runId: 'new-run' });
      await flushPromises(); expect(launcher.create).not.toHaveBeenCalled(); expect(launcher.open).not.toHaveBeenCalled();
    });
    it(`invalidates the passed origin and suppresses obsolete result after ${invalidation}`, async () => {
      let settle!: (result: any) => void;
      launcher.open.mockReturnValue(new Promise(resolve => { settle = resolve; }));
      const wrapper = mountMonitor(vi.fn());
      wrapper.getComponent({ name: 'AgentConversationFeed' }).vm.$emit('file-path-action', action);
      await flushPromises();
      const options = launcher.create.mock.calls[0][0];
      if (invalidation === 'unmount') wrapper.unmount();
      else await wrapper.setProps({ runId: 'new-run' });
      expect(options.isOriginCurrent()).toBe(false);
      settle({ status: 'failed', message: 'obsolete failure' }); await flushPromises();
      expect(wrapper.find('[data-testid="event-monitor-file-preview-status"]').exists()).toBe(false);
    });
  }
});
