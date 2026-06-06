import { describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import {
  COMPACTION_RESULT_SHAPE,
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
  it('builds a short natural task envelope with the exact current JSON shape and conversation history', () => {
    const prompt = new CompactionTaskPromptBuilder().buildTaskPrompt([makeBlock()]);

    expect(prompt).toContain('Summarize the earlier conversation history below so the same work can continue after a context refresh.');
    expect(prompt).toContain('Use the required final JSON shape exactly.');
    expect(prompt).toContain('Focus on useful conversation facts; omit bookkeeping identifiers and low-level event details.');
    expect(prompt).toContain('[REQUIRED_FINAL_JSON_SHAPE]');
    expect(prompt).toContain(COMPACTION_RESULT_SHAPE);
    expect(prompt).toContain('Your final answer must be one JSON object with this shape:');
    expect(prompt).toContain('"critical_issues": [{ "fact": "string" }]');
    expect(prompt).not.toContain('"tags"');
    expect(prompt).not.toContain('"reference"');
    expect(prompt).toContain('[CONVERSATION_HISTORY_TO_SUMMARIZE]');
    expect(prompt).not.toContain('AutoByteus memory');
    expect(prompt).not.toContain('output ' + 'contract');
    expect(prompt).not.toContain('[OUTPUT' + '_CONTRACT]');
    expect(prompt).not.toContain('raw trace');
    expect(prompt).not.toContain('block id');
    expect(prompt).not.toContain('turn id');
    expect(prompt).not.toContain('source event');
    expect(prompt).not.toMatch(/\bsettled\b/i);
    expect(prompt).not.toContain('[SETTLED_BLOCKS]');
    expect(prompt).not.toContain('[BLOCK');
    expect(prompt).not.toContain('turn=turn-1');
    expect(prompt).not.toContain('(turn-1:1)');
    expect(prompt).toContain('User asked to preserve the agent-based compaction plan.');
  });

  it('does not duplicate the long stable behavior manual owned by the compactor agent instructions', () => {
    const prompt = new CompactionTaskPromptBuilder().buildTaskPrompt([makeBlock()]);

    expect(prompt).not.toContain('Preserve key decisions, plans, constraints');
    expect(prompt).not.toContain('Drop repeated chatter, low-value operational noise');
    expect(prompt).not.toContain('Keep the result concise, durable, and future-useful');
    expect(prompt.split('\n').indexOf('[REQUIRED_FINAL_JSON_SHAPE]')).toBeLessThan(5);
  });

  it('includes tool call IDs on raw tool result and digest lines when available', () => {
    const toolCallTrace = new RawTraceItem({
      id: 'trace-call',
      ts: 1,
      turnId: 'turn-tool',
      seq: 1,
      traceType: 'tool_call',
      content: '',
      sourceEvent: 'test',
      toolName: 'inventory_lookup',
      toolCallId: 'call_123',
      toolArgs: { sku: 'A-1' },
    });
    const toolResultTrace = new RawTraceItem({
      id: 'trace-result',
      ts: 2,
      turnId: 'turn-tool',
      seq: 2,
      traceType: 'tool_result',
      content: '',
      sourceEvent: 'test',
      toolName: 'inventory_lookup',
      toolCallId: 'call_123',
      toolResult: { count: 7 },
    });
    const block: InteractionBlock = {
      blockId: 'block_tool',
      turnId: 'turn-tool',
      traceIds: [toolCallTrace.id, toolResultTrace.id],
      traces: [toolCallTrace, toolResultTrace],
      openingTraceId: toolCallTrace.id,
      closingTraceId: toolResultTrace.id,
      blockKind: 'tool_continuation',
      hasAssistantTrace: true,
      toolCallIds: ['call_123'],
      matchedToolCallIds: ['call_123'],
      hasMalformedToolTrace: false,
      isStructurallyComplete: true,
      toolResultDigests: [{
        traceId: toolResultTrace.id,
        toolCallId: 'call_123',
        toolName: 'inventory_lookup',
        status: 'success',
        summary: 'count: 7',
      }],
    };

    const rawResultBlock: InteractionBlock = {
      ...block,
      blockId: 'block_raw_tool',
      toolResultDigests: [],
    };

    const prompt = new CompactionTaskPromptBuilder().buildTaskPrompt([block, rawResultBlock]);

    expect(prompt).toContain('Tool interaction call_123 request: inventory_lookup with arguments sku: A-1.');
    expect(prompt).toContain('Tool result digest for call call_123 from inventory_lookup (success): count: 7');
    expect(prompt).toContain('Tool result for call call_123 from inventory_lookup: count: 7');
  });
});
