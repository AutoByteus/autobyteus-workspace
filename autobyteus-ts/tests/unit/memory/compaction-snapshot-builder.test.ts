import { describe, expect, it } from 'vitest';
import { MessageRole } from '../../../src/llm/utils/messages.js';
import { CompactionSnapshotBuilder } from '../../../src/memory/compaction-snapshot-builder.js';
import { CompactionPlan } from '../../../src/memory/compaction/compaction-plan.js';
import type { InteractionBlock } from '../../../src/memory/compaction/interaction-block.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { MemoryBundle } from '../../../src/memory/retrieval/memory-bundle.js';

const makeTrace = (id: string, turnId: string, seq: number, traceType: string, content: string) =>
  new RawTraceItem({
    id,
    ts: Date.now() / 1000,
    turnId,
    seq,
    traceType,
    content,
    sourceEvent: 'test'
  });

const makeBlock = (blockId: string, traces: RawTraceItem[]): InteractionBlock => ({
  blockId,
  turnId: traces[0]?.turnId ?? null,
  traceIds: traces.map((trace) => trace.id),
  traces,
  openingTraceId: traces[0]?.id ?? null,
  closingTraceId: traces.at(-1)?.id ?? null,
  blockKind: 'user',
  hasAssistantTrace: traces.some((trace) => trace.traceType === 'assistant'),
  toolCallIds: [],
  matchedToolCallIds: [],
  hasMalformedToolTrace: false,
  isStructurallyComplete: true,
  toolResultDigests: [],
});

describe('CompactionSnapshotBuilder', () => {
  it('rebuilds the snapshot with natural compacted memory and no raw frontier metadata', () => {
    const builder = new CompactionSnapshotBuilder();
    const frontierBlock = makeBlock('block_0002', [
      makeTrace('rt_3', 'turn_0002', 1, 'user', 'latest user message'),
      makeTrace('rt_4', 'turn_0002', 2, 'assistant', 'latest assistant reply'),
    ]);
    const plan = new CompactionPlan({
      blocks: [frontierBlock],
      eligibleBlocks: [],
      frontierBlocks: [frontierBlock],
      eligibleTraceIds: [],
      frontierTraceIds: frontierBlock.traceIds,
      frontierStartBlockIndex: 0,
      activeTurnId: 'turn_0002',
    });
    const bundle = new MemoryBundle({
      episodic: [
        new EpisodicItem({
          id: 'ep_1',
          ts: Date.now() / 1000,
          turnIds: ['turn_0001'],
          summary: 'Earlier work was compacted.',
        })
      ],
      semantic: [
        new SemanticItem({ id: 'sem_1', ts: 10, category: 'durable_fact', fact: 'Use pnpm exec vitest.', salience: 200 }),
        new SemanticItem({ id: 'sem_2', ts: 20, category: 'critical_issue', fact: 'Fix the Pinia getter bug.', salience: 500 }),
        new SemanticItem({ id: 'sem_3', ts: 30, category: 'important_artifact', fact: 'Implementation handoff saved at /tmp/implementation-handoff.md.', salience: 100 }),
      ]
    });

    const messages = builder.build('System prompt', bundle, plan);
    const snapshot = messages[1]?.content ?? '';

    expect(messages.map((message) => message.role)).toEqual([MessageRole.SYSTEM, MessageRole.USER]);
    expect(snapshot).toContain('You are continuing an ongoing task after compacting earlier working memory.');
    expect(snapshot).toContain('Earlier progress:');
    expect(snapshot).toContain('Critical issues:');
    expect(snapshot).toContain('Durable facts:');
    expect(snapshot).toContain('Important artifacts:');
    expect(snapshot).not.toContain('[RAW_FRONTIER]');
    expect(snapshot).not.toContain('[BLOCK');
    expect(snapshot).not.toContain('turn_000');
    expect(snapshot).not.toContain('seq');
    expect(snapshot.indexOf('Critical issues:')).toBeLessThan(snapshot.indexOf('Durable facts:'));
    expect(snapshot).toContain('/tmp/implementation-handoff.md');
    expect(snapshot).not.toContain('(ref:');
    expect(snapshot).not.toContain('latest user message');
  });

  it('returns only the system message when no compacted memory exists', () => {
    const builder = new CompactionSnapshotBuilder();
    const frontierBlock = makeBlock('block_0001', [
      makeTrace('rt_1', 'turn_0001', 1, 'user', 'latest user message'),
    ]);
    const plan = new CompactionPlan({
      blocks: [frontierBlock],
      eligibleBlocks: [],
      frontierBlocks: [frontierBlock],
      eligibleTraceIds: [],
      frontierTraceIds: frontierBlock.traceIds,
      frontierStartBlockIndex: 0,
      activeTurnId: 'turn_0001',
    });

    const messages = builder.build('System prompt', new MemoryBundle(), plan, { maxItemChars: 40 });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe('System prompt');
  });
});
