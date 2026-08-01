import { describe, expect, it } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import type { CompactionLineageRecord } from '../../../src/memory/lineage/compaction-lineage-record.js';
import { CompactedMemoryContextProjector } from '../../../src/memory/projection/compacted-memory-context-projector.js';
import type { CompactedMemoryProjectionBundle } from '../../../src/memory/projection/compacted-memory-projection-bundle.js';
import { createNaturalUserMessageProvenance } from '../../../src/memory/working-context-finalizer.js';
import { getWorkingContextMessageProvenance } from '../../../src/memory/working-context-provenance.js';

const head: CompactionLineageRecord = {
  schemaVersion: 1,
  scope: { targetKind: 'agent_run', runId: 'run-1', memberId: null },
  compactionId: 'c1',
  previousCompactionId: null,
  rawTraceArchiveFile: 'raw_traces_000001.jsonl',
  episodeIds: ['e1'],
  semanticIds: ['s1'],
  derivedAt: '2026-07-30T00:00:00.000Z',
  execution: {
    runtimeKind: 'autobyteus',
    provider: 'openai',
    model: 'model-1',
    selectionPolicyVersion: 1,
    promptContractVersion: 1,
  },
};

const bundle: CompactedMemoryProjectionBundle = {
  lineageHead: head,
  episodes: [{ id: 'e1', ts: 1, summary: 'Earlier progress', salience: 0 }],
  semantics: [{
    id: 's1',
    ts: 1,
    category: 'durable_fact',
    fact: 'Durable fact',
    salience: 200,
  }],
};

describe('CompactedMemoryContextProjector', () => {
  it('projects one exact lineage-head bundle and canonically composes a user continuation', () => {
    const system = new Message(MessageRole.SYSTEM, {
      content: 'System',
      metadata: { nested: { n: 1 } },
    });
    const continuation = createNaturalUserMessageProvenance(
      new Message(MessageRole.USER, {
        content: 'Recent',
        image_urls: ['image://one'],
      }),
      { kind: 'current_user', rawTraceIds: ['raw-recent'], turnId: 'turn-2' },
    );

    const context = new CompactedMemoryContextProjector().project({
      systemPrompt: 'Fallback ignored',
      headMessages: [system],
      continuationMessages: [
        continuation,
        new Message(MessageRole.SYSTEM, { content: 'not duplicated' }),
      ],
      bundle,
    });

    const messages = context.buildMessages();
    expect(messages.map(({ role }) => role)).toEqual([
      MessageRole.SYSTEM,
      MessageRole.USER,
    ]);
    expect(messages[1]?.content).toContain('Earlier progress');
    expect(messages[1]?.content).toContain('Durable fact');
    expect(messages[1]?.content).toContain("The user's current message is:");
    expect(messages[1]?.content).toContain('Recent');
    expect(messages[1]?.image_urls).toEqual(['image://one']);
    expect(getWorkingContextMessageProvenance(messages[1]!)).toMatchObject({
      kind: 'composed_user',
      constituents: [
        { kind: 'compacted_memory' },
        { kind: 'current_user', rawTraceIds: ['raw-recent'], turnId: 'turn-2' },
      ],
    });

    system.content = 'caller mutation';
    continuation.image_urls.push('caller mutation');
    expect(context.buildMessages()[0]?.content).toBe('System');
    expect(context.buildMessages()[1]?.image_urls).toEqual(['image://one']);
  });

  it('uses a fallback system prompt and creates no memory constituent without a head bundle', () => {
    const messages = new CompactedMemoryContextProjector().project({
      systemPrompt: 'Fallback',
      continuationMessages: [new Message(MessageRole.USER, { content: 'Recent' })],
      bundle: null,
    }).buildMessages();

    expect(messages.map(({ content }) => content)).toEqual(['Fallback', 'Recent']);
    expect(getWorkingContextMessageProvenance(messages[1]!)).toMatchObject({
      kind: 'composed_user',
      constituents: [{ kind: 'retained_user' }],
    });
  });
});
