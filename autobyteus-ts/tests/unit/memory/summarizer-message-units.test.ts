import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import type { InteractionBlock } from '../../../src/memory/compaction/interaction-block.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import type { WorkingContextMessageUnit } from '../../../src/memory/compaction/working-context-message-unit.js';

class CapturingSummarizer extends Summarizer {
  blocks: InteractionBlock[] = [];

  async summarize(blocks: InteractionBlock[]): Promise<CompactionResult> {
    this.blocks = blocks;
    return new CompactionResult('ok');
  }
}

const makeToolCallUnit = (): WorkingContextMessageUnit => ({
  id: 'unit_1_2',
  kind: 'tool_protocol_group',
  startIndex: 1,
  endIndex: 2,
  rawTraceIds: [],
  toolCallIds: ['call_1'],
  matchedToolCallIds: ['call_1'],
  isComplete: true,
  messages: [
    new Message(MessageRole.ASSISTANT, {
      reasoning_content: 'reason: need exact count',
      content: 'I will query the inventory service before deciding.',
      tool_payload: new ToolCallPayload([
        { id: 'call_1', name: 'inventory_lookup', arguments: { sku: 'A-1' } },
      ]),
    }),
    new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload('call_1', 'inventory_lookup', { count: 7 }),
    }),
  ],
});

describe('Summarizer.summarizeMessageUnits', () => {
  it('preserves assistant envelope and tool-call identity/arguments in fallback traces', async () => {
    const summarizer = new CapturingSummarizer();

    await summarizer.summarizeMessageUnits([makeToolCallUnit()]);

    const traces = summarizer.blocks[0].traces;
    const assistantTrace = traces.find((trace) => trace.traceType === 'assistant');
    const toolCallTrace = traces.find((trace) => trace.traceType === 'tool_call');
    const toolResultTrace = traces.find((trace) => trace.traceType === 'tool_result');

    expect(assistantTrace?.content).toContain('I will query the inventory service before deciding.');
    expect(assistantTrace?.content).toContain('reason: need exact count');
    expect(toolCallTrace).toMatchObject({
      toolName: 'inventory_lookup',
      toolCallId: 'call_1',
      toolArgs: { sku: 'A-1' },
    });
    expect(toolResultTrace).toMatchObject({
      toolName: 'inventory_lookup',
      toolCallId: 'call_1',
      toolResult: { count: 7 },
    });
  });
});
