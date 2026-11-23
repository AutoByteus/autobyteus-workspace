// autobyteus-628 D-1: the conversation window shows rows in the conversation's own order, never by timestamps that come
// from two clocks (a live agent message takes the viewer's clock, a user message echoed by the node takes the node's
// received_at). Compaction rows are merged in by their own time, before the first later message row.
// Production: the live handlers (handleMemberInputMessage, handleSystemTaskNotification) and
// buildRecentEventMonitorPresentation. The viewer's clock is set with fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { handleSystemTaskNotification } from '~/services/agentStreaming/handlers/systemTaskNotificationHandler';
import { handleMemberInputMessage } from '~/services/agentStreaming/handlers/memberInputMessageHandler';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import type { Conversation } from '~/types/conversation';

const NODE_RECEIVED = '2026-11-23T16:55:09.696Z';
const nodeMs = Date.parse(NODE_RECEIVED);
const EXPECTED = ['agent:please confirm: go back ', 'You', 'notice', 'agent:My recommendation stands'];

const rows = (conversation: Conversation, compactions: CompactionActivity[] = []) =>
  buildRecentEventMonitorPresentation(conversation, compactions).map((item: any) => item.kind === 'compaction'
    ? `compaction:${item.activity.activityId}`
    : item.kind === 'notice' ? 'notice'
      : item.message.type === 'user' ? 'You' : `agent:${item.message.segments.map((s: any) => s.content).join('|').slice(0, 24)}`);

/**
 * A turn as the viewer sees it live. `viewerOffsetMs`: the viewer's clock minus the node's (negative: behind).
 * `sender`: the viewer sent the message itself (shown at once, then confirmed by the node's echo); otherwise it only
 * receives the node's echo (another window, or a Team member's conversation it watches).
 */
const liveTurn = (viewerOffsetMs: number, sender: boolean) => {
  const context = { state: { runId: 'r' }, conversation: { messages: [
    { type: 'ai', text: 'please confirm', timestamp: new Date('2026-11-23T16:54:00Z'), isComplete: true,
      segments: [{ type: 'text', content: 'please confirm: go back to ACP?' }] },
  ], updatedAt: '' } } as unknown as AgentContext;
  vi.setSystemTime(new Date(nodeMs + viewerOffsetMs));
  if (sender) {
    context.conversation.messages.push({ type: 'user', text: 'You mean …?', timestamp: new Date(), messageId: 'client_b', contextFilePaths: [] } as never);
  }
  handleMemberInputMessage({ message_id: 'client_b', dedupe_key: 'member_input:x', content: 'You mean …?', input_origin: 'user_message',
    received_at: NODE_RECEIVED, context_file_paths: [] } as never, context);
  // 300 ms later (node time) the platform notice and the reply arrive; the viewer stamps the new AI message with its clock.
  vi.setSystemTime(new Date(nodeMs + 300 + viewerOffsetMs));
  handleSystemTaskNotification({ occurred_at: '2026-11-23T16:55:09.697Z', sender_id: 'system.skill_update_notifier', content: '[Platform notice — skill updated]', message_id: 'n1' }, context);
  const ai = context.conversation.messages.at(-1) as any;
  ai.segments.push({ type: 'text', content: 'My recommendation stands. Shall I?' });
  return context.conversation;
};

const compaction = (activityId: string, at: Date): CompactionActivity => ({
  kind: 'compaction', activityId, phase: 'completed', message: 'Compacted memory', timestamp: at, updatedAt: at, centerTimelineTimestamp: at,
} as CompactionActivity);

describe('the conversation window keeps the conversation order (autobyteus-628 D-1)', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it.each([
    ['the same clock', 0],
    ['the viewer 1 s behind the node (the founder\'s screenshots)', -1_000],
    ['the viewer 2 s behind', -2_000],
    ['the viewer 2 s ahead', 2_000],
  ])('the sender, %s: previous reply, You, the notice, the reply', (_case, offset) => {
    expect(rows(liveTurn(offset, true))).toEqual(EXPECTED);
  });

  it.each([
    ['the same clock', 0],
    ['the viewer 2 s behind', -2_000],
    ['the viewer 2 s ahead', 2_000],
  ])('a viewer that only receives the echo (another window, a Team member), %s: the same order', (_case, offset) => {
    expect(rows(liveTurn(offset, false))).toEqual(EXPECTED);
  });

  it('a compaction between two turns (equal clocks) sits between them, as before; at an equal time the message comes first', () => {
    const t = (s: number) => new Date(Date.UTC(2026, 10, 23, 17, 0, s));
    const conversation = { messages: [
      { type: 'user', text: 'first', timestamp: t(1), contextFilePaths: [] },
      { type: 'ai', text: 'one', timestamp: t(2), isComplete: true, segments: [{ type: 'text', content: 'one' }] },
      { type: 'user', text: 'second', timestamp: t(5), contextFilePaths: [] },
      { type: 'ai', text: 'two', timestamp: t(6), isComplete: true, segments: [{ type: 'text', content: 'two' }] },
    ], updatedAt: '' } as unknown as Conversation;
    expect(rows(conversation, [compaction('between', t(3)), compaction('tied', t(5)), compaction('after', t(9))]))
      .toEqual(['You', 'agent:one', 'compaction:between', 'You', 'compaction:tied', 'agent:two', 'compaction:after']);
  });

  it('with the viewer behind, a compaction never reorders the messages, wherever it lands', () => {
    const conversation = liveTurn(-2_000, true);
    const result = rows(conversation, [compaction('live', new Date(nodeMs - 1_900)), compaction('early', new Date('2026-11-23T16:00:00Z'))]);
    expect(result.filter((row) => !row.startsWith('compaction:'))).toEqual(EXPECTED);
    expect(result[0]).toBe('compaction:early');
  });
});
