import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import { handleCompactionStatus } from '~/services/agentStreaming/handlers/agentStatusHandler';
import type { Conversation } from '~/types/conversation';

let pinia: Pinia;

const createConversation = (id: string): Conversation => ({
  id,
  createdAt: '2026-05-31T10:00:00.000Z',
  updatedAt: '2026-05-31T10:00:00.000Z',
  messages: [
    {
      type: 'user',
      text: 'Summarize the state.',
      timestamp: new Date('2026-05-31T10:00:01.000Z'),
    },
  ],
});

const createContext = (runId: string, conversation: Conversation) => ({
  state: {
    runId,
    conversation,
    compactionStatus: null,
  },
  conversation,
  isSending: false,
  config: {},
});

const mountMonitor = (conversation: Conversation, runId: string) => mount(AgentEventMonitor, {
  props: {
    conversation,
    runId,
    agentName: 'Validation Agent',
  },
  global: {
    plugins: [pinia],
    stubs: {
      AgentUserInputForm: { template: '<div data-testid="agent-input-stub" />' },
      UserMessage: {
        props: ['message'],
        template: '<div data-testid="user-message">{{ message.text }}</div>',
      },
      AIMessage: {
        props: ['runId'],
        template: '<div data-testid="ai-message">{{ runId }}</div>',
      },
      Icon: { template: '<span data-testid="icon-stub" />' },
    },
  },
});

describe('AgentEventMonitor live compaction flow', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('renders a live single-agent compaction status as an in-feed row from the streaming handler', () => {
    const conversation = createConversation('run-live-1');
    const context = createContext('run-live-1', conversation);

    handleCompactionStatus({
      phase: 'failed',
      turn_id: 'turn-live-1',
      error_message: 'Backend compaction quota exceeded',
    }, context as any);

    const wrapper = mountMonitor(conversation, 'run-live-1');
    const feed = wrapper.get('[data-testid="agent-conversation-feed"]');

    expect(feed.find('[data-testid="compaction-status-row"]').exists()).toBe(true);
    expect(feed.text()).toContain('Backend compaction quota exceeded');
    expect(feed.text()).toContain('Turn: turn-live-1');
    expect(wrapper.html()).not.toContain('compaction-status-banner');
  });

  it('uses explicit run identity so focused team-member compaction rows do not leak across conversations', () => {
    const professorConversation = createConversation('team-run-1::Professor');
    const studentConversation = createConversation('team-run-1::Student');
    const professorContext = createContext('professor-run-1', professorConversation);
    const studentContext = createContext('student-run-1', studentConversation);

    handleCompactionStatus({
      phase: 'failed',
      turn_id: 'turn-professor',
      error_message: 'Professor compaction failed',
    }, professorContext as any);
    handleCompactionStatus({
      phase: 'failed',
      turn_id: 'turn-student',
      error_message: 'Student compaction failed',
    }, studentContext as any);

    const wrapper = mountMonitor(professorConversation, 'professor-run-1');
    const feed = wrapper.get('[data-testid="agent-conversation-feed"]');

    expect(feed.find('[data-testid="compaction-status-row"]').exists()).toBe(true);
    expect(feed.text()).toContain('Professor compaction failed');
    expect(feed.text()).not.toContain('Student compaction failed');
  });
});
