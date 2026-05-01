import { describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import {
  COMPACTION_OUTPUT_CONTRACT,
  CompactionTaskPromptBuilder,
} from '../../../src/memory/compaction/compaction-task-prompt-builder.js';
import type { InteractionBlock } from '../../../src/memory/compaction/interaction-block.js';

const makeBlock = (): InteractionBlock => {
  const trace = new RawTraceItem({
    id: 'trace-1',
    ts: 1,
    turnId: 'turn-1',
    seq: 1,
    traceType: 'user',
    content: 'User asked to preserve the agent-based compaction plan.',
    sourceEvent: 'test',
  });

  return {
    blockId: 'block_0001',
    turnId: 'turn-1',
    traceIds: [trace.id],
    traces: [trace],
    openingTraceId: trace.id,
    closingTraceId: trace.id,
    blockKind: 'user',
    hasAssistantTrace: false,
    toolCallIds: [],
    matchedToolCallIds: [],
    hasMalformedToolTrace: false,
    isStructurallyComplete: true,
    toolResultDigests: [],
  };
};

describe('CompactionTaskPromptBuilder', () => {
  it('builds a short task envelope with the exact current JSON contract and settled blocks', () => {
    const prompt = new CompactionTaskPromptBuilder().buildTaskPrompt([makeBlock()]);

    expect(prompt).toContain('Compact the settled blocks below into durable AutoByteus memory.');
    expect(prompt).toContain('Use the current output contract exactly.');
    expect(prompt).toContain('[OUTPUT_CONTRACT]');
    expect(prompt).toContain(COMPACTION_OUTPUT_CONTRACT);
    expect(prompt).toContain('"critical_issues": [{ "fact": "string" }]');
    expect(prompt).not.toContain('"tags"');
    expect(prompt).not.toContain('"reference"');
    expect(prompt).toContain('[SETTLED_BLOCKS]');
    expect(prompt).toContain('[BLOCK block_0001] turn=turn-1 kind=user');
    expect(prompt).toContain('User asked to preserve the agent-based compaction plan.');
  });

  it('does not duplicate the long stable behavior manual owned by the compactor agent instructions', () => {
    const prompt = new CompactionTaskPromptBuilder().buildTaskPrompt([makeBlock()]);

    expect(prompt).not.toContain('Preserve key decisions, plans, constraints');
    expect(prompt).not.toContain('Drop repeated chatter, low-value operational noise');
    expect(prompt).not.toContain('Keep the result concise, durable, and future-useful');
    expect(prompt.split('\n').indexOf('[OUTPUT_CONTRACT]')).toBeLessThan(4);
  });
});
