import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AIMessage, Conversation } from '~/types/conversation';
import type { AIResponseTextSegment, ToolCallSegment } from '~/types/segments';
import {
  markStreamSegmentPresentationComplete,
  setStreamSegmentIdentity,
} from '~/services/agentStreaming/handlers/segmentIdentity';
import {
  beginRecentEventMonitorMutation,
  commitKnownRecentEventMonitorPresentationMutation,
  commitRecentEventMonitorMutation,
} from '../recentEventMonitorMutationCommit';

const createContext = (conversation: Conversation): AgentContext => new AgentContext(
  {} as any,
  new AgentRunState(conversation.id, conversation),
);

const conversationWith = (messages: Conversation['messages']): Conversation => ({
  id: 'run-1',
  messages,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

const mutableText = (index: number): AIResponseTextSegment => {
  const segment: AIResponseTextSegment = { type: 'text', content: `segment-${index}` };
  setStreamSegmentIdentity(segment, `segment-${index}`, 'text');
  return segment;
};

const toolSegment = (): ToolCallSegment => ({
  type: 'tool_call', invocationId: 'tool-1', toolName: 'search', arguments: { query: 'weather' },
  status: 'success', approvalTarget: null, logs: [], result: null, error: null,
});

describe('recent Event Monitor mutation commit', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('does not revise when a transient completed append is immediately evicted from 100 mutable events', () => {
    const aiMessage: AIMessage = {
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false,
      segments: Array.from({ length: 100 }, (_, index) => mutableText(index)),
    };
    const context = createContext(conversationWith([aiMessage]));
    const baseline = beginRecentEventMonitorMutation(context);

    context.conversation.messages.push({
      type: 'user', text: 'transient atomic event', timestamp: new Date(1), messageId: 'transient',
    });
    const result = commitRecentEventMonitorMutation(context, baseline);

    expect(result).toMatchObject({ retentionChanged: true, presentationChanged: false });
    expect(context.state.eventMonitorPresentationRevision).toBe(0);
    expect(context.conversation.messages).toEqual([aiMessage]);
  });

  it('revises once for a retained visible content change', () => {
    const segment = mutableText(0);
    const context = createContext(conversationWith([{
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false, segments: [segment],
    }]));
    const baseline = beginRecentEventMonitorMutation(context);

    segment.content = 'visible changed content';
    const result = commitRecentEventMonitorMutation(context, baseline);

    expect(result.presentationChanged).toBe(true);
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
  });

  it('revises once for a classification-only eviction that changes final membership', () => {
    const segments = Array.from({ length: 101 }, (_, index) => mutableText(index));
    const context = createContext(conversationWith([{
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false, segments,
    }]));
    const baseline = beginRecentEventMonitorMutation(context);
    const completedSegment = segments[50]!;

    markStreamSegmentPresentationComplete(completedSegment);
    const result = commitRecentEventMonitorMutation(context, baseline);

    expect(result).toMatchObject({ retentionChanged: true, presentationChanged: true });
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
    expect((context.conversation.messages[0] as AIMessage).segments).toHaveLength(100);
    expect((context.conversation.messages[0] as AIMessage).segments).toContain(segments[0]);
    expect((context.conversation.messages[0] as AIMessage).segments).not.toContain(completedSegment);
  });

  it('ignores result/log-only mutations and equal derived argument replacement', () => {
    const segment = toolSegment();
    const context = createContext(conversationWith([{
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false, segments: [segment],
    }]));
    const baseline = beginRecentEventMonitorMutation(context);

    segment.logs.push('Activity-only log');
    segment.result = { output: 'Activity-only result' };
    segment.arguments = { query: 'weather' };
    const result = commitRecentEventMonitorMutation(context, baseline);

    expect(result.presentationChanged).toBe(false);
    expect(context.state.eventMonitorPresentationRevision).toBe(0);
  });

  it('revises for a true shared tool-card summary change', () => {
    const segment = toolSegment();
    const context = createContext(conversationWith([{
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false, segments: [segment],
    }]));
    const baseline = beginRecentEventMonitorMutation(context);

    segment.arguments = { query: 'forecast' };
    const result = commitRecentEventMonitorMutation(context, baseline);

    expect(result.presentationChanged).toBe(true);
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
  });

  it('enforces retention and commits exactly one handler-known presentation change', () => {
    const segments = Array.from({ length: 101 }, (_, index) => mutableText(index));
    const context = createContext(conversationWith([{
      type: 'ai', text: '', timestamp: new Date(0), isComplete: false, segments,
    }]));

    const result = commitKnownRecentEventMonitorPresentationMutation(context);

    expect(result).toMatchObject({ retentionChanged: true, presentationChanged: true });
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
    expect(context.state.hasEarlierActiveTraceEvents).toBe(true);
    expect((context.conversation.messages[0] as AIMessage).segments).toHaveLength(100);
  });
});
