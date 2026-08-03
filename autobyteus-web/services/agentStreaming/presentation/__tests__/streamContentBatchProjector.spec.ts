import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AIMessage, Conversation } from '~/types/conversation';
import type { AIResponseTextSegment } from '~/types/segments';
import { projectStreamContentBatch } from '../streamContentBatchProjector';

const createContext = (): AgentContext => {
  const conversation: Conversation = {
    id: 'run-1',
    messages: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
  return new AgentContext({} as any, new AgentRunState('run-1', conversation));
};

describe('projectStreamContentBatch', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('applies exact coalesced bytes and marks one revision for a changed context batch', () => {
    const context = createContext();

    projectStreamContentBatch(context, {
      latestActivityAt: '2026-08-01T10:00:00.123Z',
      contentPayloads: [
        { id: 'segment-1', turn_id: 'turn-1', segment_type: 'text', delta: 'hello' },
        { id: 'segment-2', turn_id: 'turn-1', segment_type: 'text', delta: ' world' },
      ],
    });

    const message = context.conversation.messages[0] as AIMessage;
    expect((message.segments[0] as AIResponseTextSegment).content).toBe('hello');
    expect((message.segments[1] as AIResponseTextSegment).content).toBe(' world');
    expect(context.conversation.updatedAt).toBe('2026-08-01T10:00:00.123Z');
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
  });

  it('advances receipt-time recency without revising for timestamp-only no-op content', () => {
    const context = createContext();

    projectStreamContentBatch(context, {
      latestActivityAt: '2026-08-01T10:00:00.456Z',
      contentPayloads: [
        { id: 'segment-1', turn_id: 'turn-1', segment_type: 'text', delta: '' },
      ],
    });

    expect(context.conversation.messages).toEqual([]);
    expect(context.conversation.updatedAt).toBe('2026-08-01T10:00:00.456Z');
    expect(context.state.eventMonitorPresentationRevision).toBe(0);
  });
});
