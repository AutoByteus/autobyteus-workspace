import { describe, expect, it } from 'vitest';
import type { AIMessage, Conversation, UserMessage } from '~/types/conversation';
import type { AIResponseTextSegment } from '~/types/segments';
import { setStreamSegmentIdentity } from '~/services/agentStreaming/handlers/segmentIdentity';
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
  setStreamSegmentIdentity(segment, id, 'text');
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
