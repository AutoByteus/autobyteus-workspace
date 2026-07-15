import { describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { CompactedMemoryContextProjector } from '../../../src/memory/projection/compacted-memory-context-projector.js';
import { MemoryBundle } from '../../../src/memory/retrieval/memory-bundle.js';

describe('CompactedMemoryContextProjector', () => {
  it('owns bounded retrieval and returns detached head + one memory message + continuation', () => {
    const bundle = new MemoryBundle({
      episodic: [new EpisodicItem({ id: 'e1', ts: 1, turnIds: [], summary: 'Earlier progress', salience: 0 })],
      semantic: [new SemanticItem({ id: 's1', ts: 1, category: 'durable_fact', fact: 'Durable fact' })],
    });
    const retriever = { retrieve: vi.fn(() => bundle) };
    const head = new Message(MessageRole.SYSTEM, { content: 'System', metadata: { nested: { n: 1 } } });
    const continuation = new Message(MessageRole.USER, { content: 'Recent', image_urls: ['image://one'] });

    const context = new CompactedMemoryContextProjector(retriever as any).project({
      systemPrompt: 'Fallback ignored',
      headMessages: [head],
      continuationMessages: [continuation, new Message(MessageRole.SYSTEM, { content: 'not duplicated' })],
      maxEpisodic: 3,
      maxSemantic: 20,
    });

    expect(retriever.retrieve).toHaveBeenCalledWith(3, 20);
    const messages = context.buildMessages();
    expect(messages.map(({ role }) => role)).toEqual([MessageRole.SYSTEM, MessageRole.USER, MessageRole.USER]);
    expect(messages[1]?.content).toContain('Earlier progress');
    expect(messages[1]?.content).toContain('Durable fact');
    expect(messages.filter((message) => message.content?.includes('Earlier progress'))).toHaveLength(1);
    head.content = 'caller mutation';
    continuation.image_urls.push('caller mutation');
    expect(context.buildMessages()[0]?.content).toBe('System');
    expect(context.buildMessages()[2]?.image_urls).toEqual(['image://one']);
  });

  it('uses a fallback system prompt and omits an empty memory message', () => {
    const retriever = { retrieve: vi.fn(() => new MemoryBundle()) };
    const messages = new CompactedMemoryContextProjector(retriever as any).project({
      systemPrompt: 'Fallback',
      continuationMessages: [new Message(MessageRole.USER, { content: 'Recent' })],
      maxEpisodic: 1,
      maxSemantic: 2,
    }).buildMessages();
    expect(messages.map(({ content }) => content)).toEqual(['Fallback', 'Recent']);
  });
});
