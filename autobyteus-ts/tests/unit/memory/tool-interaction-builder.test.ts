import { describe, it, expect } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { buildToolInteractions } from '../../../src/memory/tool-interaction-builder.js';
import { ToolInteractionStatus } from '../../../src/memory/models/tool-interaction.js';

const makeTrace = (options: {
  traceType: string;
  turnId?: string;
  toolCallId?: string | null;
  toolName?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown;
  toolError?: string | null;
  seq: number;
}) =>
  new RawTraceItem({
    id: `rt_${options.seq}`,
    ts: Date.now() / 1000,
    turnId: options.turnId ?? 'turn_0001',
    seq: options.seq,
    traceType: options.traceType,
    content: '',
    sourceEvent: 'TestEvent',
    toolName: options.toolName ?? null,
    toolCallId: options.toolCallId ?? null,
    toolArgs: options.toolArgs ?? null,
    toolResult: options.toolResult ?? null,
    toolError: options.toolError ?? null
  });

describe('buildToolInteractions', () => {
  it('builds a complete interaction with success', () => {
    const traces = [
      makeTrace({
        traceType: 'tool_call',
        seq: 1,
        toolCallId: 'call_1',
        toolName: 'write_file',
        toolArgs: { path: 'x.txt' }
      }),
      makeTrace({
        traceType: 'tool_result',
        seq: 2,
        toolCallId: 'call_1',
        toolName: 'write_file',
        toolResult: 'ok'
      })
    ];

    const interactions = buildToolInteractions(traces);
    expect(interactions).toHaveLength(1);
    expect(interactions[0].toolCallId).toBe('call_1');
    expect(interactions[0].toolName).toBe('write_file');
    expect(interactions[0].arguments).toEqual({ path: 'x.txt' });
    expect(interactions[0].result).toBe('ok');
    expect(interactions[0].status).toBe(ToolInteractionStatus.SUCCESS);
  });

  it('marks interaction as error when tool_result has error', () => {
    const traces = [
      makeTrace({
        traceType: 'tool_call',
        seq: 1,
        toolCallId: 'call_2',
        toolName: 'read_file',
        toolArgs: { path: 'missing.txt' }
      }),
      makeTrace({
        traceType: 'tool_result',
        seq: 2,
        toolCallId: 'call_2',
        toolName: 'read_file',
        toolError: 'not found'
      })
    ];

    const interactions = buildToolInteractions(traces);
    expect(interactions).toHaveLength(1);
    expect(interactions[0].status).toBe(ToolInteractionStatus.ERROR);
    expect(interactions[0].error).toBe('not found');
  });

  it('keeps pending status when only tool_call exists', () => {
    const traces = [
      makeTrace({
        traceType: 'tool_call',
        seq: 1,
        toolCallId: 'call_3',
        toolName: 'search_web',
        toolArgs: { query: 'test' }
      })
    ];

    const interactions = buildToolInteractions(traces);
    expect(interactions).toHaveLength(1);
    expect(interactions[0].status).toBe(ToolInteractionStatus.PENDING);
  });
});
