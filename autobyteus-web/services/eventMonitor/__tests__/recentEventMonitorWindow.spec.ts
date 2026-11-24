import { describe, expect, it } from 'vitest';
import type { AIMessage, Conversation, UserMessage } from '~/types/conversation';
import type { AIResponseTextSegment, SystemTaskNotificationSegment, TerminalCommandSegment } from '~/types/segments';
import type { AgentContext } from '~/types/agent/AgentContext';
import { setStreamSegmentIdentity } from '~/services/agentStreaming/handlers/segmentIdentity';
import { handleSystemTaskNotification } from '~/services/agentStreaming/handlers/systemTaskNotificationHandler';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { getRecentEventMonitorTotalUsageText } from '../recentEventMonitorUsagePresentation';
import {
  buildRecentEventMonitorPresentation,
  enforceRecentConversationWindow,
} from '../recentEventMonitorWindow';

const userMessage = (index: number): UserMessage => ({
  type: 'user',
  text: `user-${index}`,
  timestamp: new Date(index * 1000),
  messageId: `user-${index}`,
});

const conversationWith = (messages: Conversation['messages']): Conversation => ({
  id: 'run-1',
  messages,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date().toISOString(),
});

const mutableText = (id: string): AIResponseTextSegment => {
  const segment: AIResponseTextSegment = { type: 'text', content: id };
  setStreamSegmentIdentity(segment, 'turn-1', id, 'text');
  return segment;
};

describe('recent Event Monitor window', () => {
  it('evicts the oldest completed event before an older mutable segment', () => {
    const mutable = mutableText('mutable-1');
    const aiMessage: AIMessage = {
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false, segments: [mutable],
    };
    const conversation = conversationWith([
      aiMessage,
      ...Array.from({ length: 100 }, (_, index) => userMessage(index + 1)),
    ]);

    const result = enforceRecentConversationWindow(conversation);

    expect(result).toMatchObject({ retentionChanged: true, completedEvictions: 1, forcedMutableEvictions: 0 });
    expect((conversation.messages[0] as AIMessage).segments[0]).toBe(mutable);
    expect(conversation.messages.some((message) => message.type === 'user' && message.messageId === 'user-1')).toBe(false);
    expect(conversation.messages).toHaveLength(100);
  });

  it('uses the deterministic oldest-mutable fallback and admits one late source-limited representation', () => {
    const message: AIMessage = {
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false,
      segments: Array.from({ length: 101 }, (_, index) => mutableText(`segment-${index}`)),
    };
    const conversation = conversationWith([message]);

    const first = enforceRecentConversationWindow(conversation);
    expect(first.forcedMutableEvictions).toBe(1);
    expect(message.segments).toHaveLength(100);
    expect(message.segments.some((segment) => segment.type === 'text' && segment.content === 'segment-0')).toBe(false);

    const late = mutableText('segment-0');
    late.content = 'source-limited terminal update';
    message.segments.push(late);
    const second = enforceRecentConversationWindow(conversation);

    expect(second.forcedMutableEvictions).toBe(1);
    expect(message.segments).toHaveLength(100);
    expect(message.segments.filter((segment) => (segment as AIResponseTextSegment).content === late.content)).toHaveLength(1);
    expect(message.segments.at(-1)).toBe(late);
  });

  it('caps the combined mounted presentation and protects a started compaction row', () => {
    const conversation = conversationWith(Array.from({ length: 100 }, (_, index) => userMessage(index + 1)));
    const presentation = buildRecentEventMonitorPresentation(conversation, [{
      kind: 'compaction',
      activityId: 'compaction-1',
      phase: 'started',
      message: 'Compacting memory…',
      timestamp: new Date(0),
      updatedAt: new Date(0),
      centerTimelineTimestamp: new Date(0),
    }]);

    expect(presentation).toHaveLength(100);
    expect(presentation[0]).toMatchObject({ kind: 'compaction', key: 'compaction-compaction-1' });
    expect(presentation.some((item) => item.kind === 'message' && item.message.type === 'user' && item.message.messageId === 'user-1')).toBe(false);
  });
});

// autobyteus-585: a platform notice is its own row, never inside the agent's message.
describe('recent Event Monitor presentation: platform notice rows', () => {
  const RESTART_NOTICE = '[Platform notice — application restarted]\n\nThe application restarted at 2026-11-21 07:32 UTC while you were working. Continue your task.';
  const restartNotice = (messageId = 'notice-1'): SystemTaskNotificationSegment => ({
    type: 'system_task_notification', senderId: 'system.restart_resume', content: RESTART_NOTICE, messageId,
  });
  const terminal = (invocationId: string): TerminalCommandSegment => ({
    type: 'terminal_command', invocationId, toolName: 'run_bash', arguments: {}, status: 'success',
    logs: [], result: 'ok', error: null, command: 'pnpm build', description: '',
  });
  const text = (content: string): AIResponseTextSegment => ({ type: 'text', content });
  const aiMessage = (segments: AIMessage['segments'], usage: Partial<AIMessage> = {}): AIMessage => ({
    type: 'ai', text: '', timestamp: new Date(2000), isComplete: true, segments, ...usage,
  });
  /** Each row as `kind:what it shows`, in order. */
  const rows = (conversation: Conversation) => buildRecentEventMonitorPresentation(conversation, []).map((item) => {
    if (item.kind === 'notice') return `notice:${item.segment.messageId}`;
    if (item.kind === 'compaction') return 'compaction';
    if (item.message.type === 'user') return `user:${item.message.text}`;
    return `agent:${item.message.segments.map((segment) => segment.type === 'text' ? segment.content : segment.type).join('+')}`;
  });

  it('AC-001: a wake notice after a tool card splits the agent message into agent row, notice row, agent row', () => {
    const conversation = conversationWith([
      userMessage(1),
      aiMessage([text('Starting the build.'), terminal('bash-1'), restartNotice(), text('I have stopped and am waiting.')]),
    ]);

    expect(rows(conversation)).toEqual([
      'user:user-1',
      'agent:Starting the build.+terminal_command',
      'notice:notice-1',
      'agent:I have stopped and am waiting.',
    ]);
    const items = buildRecentEventMonitorPresentation(conversation, []);
    expect(items[2]).toEqual({
      kind: 'notice', key: 'notice-1-2', segment: (conversation.messages[1] as AIMessage).segments[2], messageIndex: 1,
    });
    // the agent row's own text no longer carries the notice or the later reply
    expect(items[1]!.kind === 'message' && items[1]!.message.text).toBe('Starting the build.');
    expect(items[3]!.kind === 'message' && items[3]!.message.text).toBe('I have stopped and am waiting.');
  });

  it('AC-002: a notice starting an AI message comes before the agent row; one in the middle splits it', () => {
    const tools: SystemTaskNotificationSegment = {
      type: 'system_task_notification', senderId: 'system.tool_list_update_notifier',
      content: '[Platform notice — tools updated]\n\nYour tools changed. Now available: search.', messageId: 'tools-1',
    };
    expect(rows(conversationWith([userMessage(1), aiMessage([tools, text('On it.'), terminal('bash-1')])])))
      .toEqual(['user:user-1', 'notice:tools-1', 'agent:On it.+terminal_command']);
    expect(rows(conversationWith([userMessage(1), aiMessage([text('Before.'), tools, text('After.')])])))
      .toEqual(['user:user-1', 'agent:Before.', 'notice:tools-1', 'agent:After.']);
  });

  it('AC-003: the same notice live and after a reload is one notice row in the same place', () => {
    const live = conversationWith([
      userMessage(1),
      aiMessage([text('Started.'), restartNotice('n1'), text('Continuing.')]),
    ]);
    const hydrated = buildConversationFromProjection('run-1', [
      { kind: 'message', role: 'user', content: 'user-1', ts: 1 },
      { kind: 'message', role: 'assistant', content: 'Started.', ts: 2 },
      { kind: 'system_task_notification', role: null, senderId: 'system.restart_resume', content: RESTART_NOTICE, messageId: 'n1', ts: 3 },
      { kind: 'message', role: 'assistant', content: 'Continuing.', ts: 4 },
    ], { agentDefinitionId: 'agent-1', agentName: 'Agent', llmModelIdentifier: 'model' });

    const expected = ['user:user-1', 'agent:Started.', 'notice:n1', 'agent:Continuing.'];
    expect(rows(live)).toEqual(expected);
    expect(rows(hydrated)).toEqual(expected);

    // a replayed frame of the same notice id adds nothing to the reloaded conversation
    const context = { state: { runId: 'run-1' }, conversation: hydrated } as unknown as AgentContext;
    expect(handleSystemTaskNotification({ occurred_at: '2026-11-23T16:55:09.697Z', sender_id: 'system.restart_resume', content: RESTART_NOTICE, message_id: 'n1' }, context)).toBe(false);
    expect(rows(hydrated)).toEqual(expected);
  });

  it('AC-007: a split message shows and counts its usage once, on its last row', () => {
    const conversation = conversationWith([
      aiMessage([text('Starting the build.'), terminal('bash-1'), restartNotice(), text('Waiting.')],
        { completionTokens: 120, completionCost: 0.0012 }),
    ]);
    const items = buildRecentEventMonitorPresentation(conversation, []);
    const messageItems = items.filter((item) => item.kind === 'message');

    expect(messageItems.map((item) => item.kind === 'message' && item.showsUsage)).toEqual([false, true]);
    expect(getRecentEventMonitorTotalUsageText(items)).toBe('Total: 120 tokens / $0.0012');
  });

  it('an unsplit message and a user message show their usage', () => {
    const conversation = conversationWith([
      { ...userMessage(1), promptTokens: 10, promptCost: 0.0001 },
      aiMessage([text('Done.')], { completionTokens: 20, completionCost: 0.0002 }),
    ]);
    const items = buildRecentEventMonitorPresentation(conversation, []);
    expect(items.map((item) => item.kind === 'message' && item.showsUsage)).toEqual([true, true]);
    expect(getRecentEventMonitorTotalUsageText(items)).toBe('Total: 30 tokens / $0.0003');
  });
});
