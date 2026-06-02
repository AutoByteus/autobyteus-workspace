import { afterEach, describe, it, expect, vi } from 'vitest';
import { ToolResultContinuationBuilder } from '../../../../src/agent/loop/tool-result-continuation-builder.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import {
  NATIVE_API_TOOL_CONTINUATION_MODE,
  TOOL_HISTORY_ONLY_CONTINUATION_MODE,
  TOOL_CONTINUATION_MODE_METADATA_KEY
} from '../../../../src/agent/message/tool-continuation-metadata.js';

const originalParser = process.env.AUTOBYTEUS_STREAM_PARSER;

afterEach(() => {
  if (originalParser === undefined) {
    delete process.env.AUTOBYTEUS_STREAM_PARSER;
  } else {
    process.env.AUTOBYTEUS_STREAM_PARSER = originalParser;
  }
});

describe('ToolResultContinuationBuilder', () => {
  it('persists text-parser tool results and marks continuation as renderer-owned tool history', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    const builder = new ToolResultContinuationBuilder();
    const resultEvent = new ToolResultEvent('tool_a', { ok: true }, 'inv-1', undefined, { value: 1 }, 'turn-1', false);
    const ingestToolResults = vi.fn();

    const message = builder.build([resultEvent], {
      context: {
        agentId: 'agent-1',
        state: { memoryManager: { ingestToolResults } }
      } as any,
      turn: { turnId: 'turn-1' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledWith([resultEvent], 'turn-1', {
      source: 'text_history_ordered_batch'
    });
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toBe('Tool history continuation');
    expect(message.contextFiles).toBeNull();
    expect(message.metadata).toEqual({
      [TOOL_CONTINUATION_MODE_METADATA_KEY]: TOOL_HISTORY_ONLY_CONTINUATION_MODE,
      turn_id: 'turn-1',
      tool_result_count: 1
    });
  });

  it('persists native API tool results and marks continuation as tool-history-only', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const builder = new ToolResultContinuationBuilder();
    const resultEvent = new ToolResultEvent('tool_a', { ok: true }, 'inv-1', undefined, { value: 1 }, 'turn-1', false);
    const ingestToolResults = vi.fn();

    const message = builder.build([resultEvent], {
      context: {
        agentId: 'agent-1',
        state: { memoryManager: { ingestToolResults } }
      } as any,
      turn: { turnId: 'turn-1' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledWith([resultEvent], 'turn-1', {
      source: 'native_api_ordered_batch'
    });
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toBe('Native API tool continuation');
    expect(message.contextFiles).toBeNull();
    expect(message.metadata).toEqual({
      [TOOL_CONTINUATION_MODE_METADATA_KEY]: NATIVE_API_TOOL_CONTINUATION_MODE,
      turn_id: 'turn-1',
      tool_result_count: 1
    });
  });
});
