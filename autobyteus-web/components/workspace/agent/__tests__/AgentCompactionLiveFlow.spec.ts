import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import { handleCompactionStatus } from '~/services/agentStreaming/handlers/agentStatusHandler';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
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

  it('updates one native deferred semantic compaction row across requested, started, and failed events', () => {
    const conversation = createConversation('run-native-deferred');
    const context = createContext('run-native-deferred', conversation);

    handleCompactionStatus({
      phase: 'requested',
      turn_id: 'turn-2',
      compaction_operation_id: 'operation-native-1',
      requested_turn_id: 'turn-2',
      selected_block_count: null,
      compacted_block_count: null,
    }, context as any);
    handleCompactionStatus({
      phase: 'started',
      turn_id: 'turn-3',
      compaction_operation_id: 'operation-native-1',
      requested_turn_id: 'turn-2',
      execution_turn_id: 'turn-3',
      selected_block_count: 4,
      compacted_block_count: null,
      compaction_run_id: 'child-run-1',
      compaction_task_id: 'child-task-1',
    }, context as any);
    handleCompactionStatus({
      phase: 'failed',
      turn_id: 'turn-3',
      compaction_operation_id: 'operation-native-1',
      requested_turn_id: 'turn-2',
      execution_turn_id: 'turn-3',
      selected_block_count: 4,
      compacted_block_count: null,
      compaction_run_id: 'child-run-1',
      compaction_task_id: 'child-task-1',
      error_message: 'Memory compaction failed before dispatch',
    }, context as any);

    const store = useAgentActivityStore();
    const activities = store.getCompactionActivities('run-native-deferred');
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      activityId: 'compaction:operation:operation-native-1',
      phase: 'failed',
      turnId: 'turn-3',
      compactionOperationId: 'operation-native-1',
      requestedTurnId: 'turn-2',
      executionTurnId: 'turn-3',
      compactionRunId: 'child-run-1',
      compactionTaskId: 'child-task-1',
      errorMessage: 'Memory compaction failed before dispatch',
    });

    const wrapper = mountMonitor(conversation, 'run-native-deferred');
    const rows = wrapper.findAll('[data-testid="compaction-status-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Memory compaction failed before dispatch');
    expect(rows[0].text()).toContain('Turn: turn-3');
  });
});
