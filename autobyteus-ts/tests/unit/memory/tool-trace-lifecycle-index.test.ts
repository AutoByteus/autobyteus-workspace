import { describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { toolCallIdentityKey } from '../../../src/memory/models/tool-call-identity.js';
import {
  buildToolCallContextIndex,
  buildToolTraceLifecycleIndex,
} from '../../../src/memory/tool-trace-lifecycle-index.js';

const trace = (input: {
  id: string;
  turnId: string;
  seq: number;
  traceType: 'tool_call' | 'tool_result';
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
}) => new RawTraceItem({
  id: input.id,
  ts: input.seq,
  turnId: input.turnId,
  seq: input.seq,
  traceType: input.traceType,
  content: '',
  sourceEvent: 'test',
  toolCallId: 'same',
  toolName: input.toolName,
  toolArgs: input.toolArgs,
  ...(Object.prototype.hasOwnProperty.call(input, 'toolResult') ? { toolResult: input.toolResult } : {}),
});

describe('tool trace lifecycle index', () => {
  it('groups physical rows by compound identity and keeps the first call and result', () => {
    const groups = buildToolTraceLifecycleIndex([
      trace({ id: 'call-a', turnId: 'turn-a', seq: 1, traceType: 'tool_call', toolName: 'read_file', toolArgs: { path: 'a' } }),
      trace({ id: 'call-a-duplicate', turnId: 'turn-a', seq: 2, traceType: 'tool_call', toolName: 'wrong', toolArgs: { path: 'wrong' } }),
      trace({ id: 'result-a', turnId: 'turn-a', seq: 3, traceType: 'tool_result', toolResult: 'a' }),
      trace({ id: 'result-a-duplicate', turnId: 'turn-a', seq: 4, traceType: 'tool_result', toolResult: 'wrong' }),
      trace({ id: 'call-b', turnId: 'turn-b', seq: 1, traceType: 'tool_call', toolName: 'read_file', toolArgs: { path: 'b' } }),
    ]);

    expect(groups.size).toBe(2);
    expect(groups.get(toolCallIdentityKey({ turnId: 'turn-a', toolCallId: 'same' }))).toMatchObject({
      call: { id: 'call-a' },
      result: { id: 'result-a' },
    });
    expect(groups.get(toolCallIdentityKey({ turnId: 'turn-b', toolCallId: 'same' }))).toMatchObject({
      call: { id: 'call-b' },
      result: null,
    });
  });

  it('derives writer-safe call context without historical result-side overlays or raw ids', () => {
    const groups = buildToolTraceLifecycleIndex([
      trace({ id: 'call', turnId: 'turn-a', seq: 1, traceType: 'tool_call', toolName: 'search_web', toolArgs: {} }),
      new RawTraceItem({
        id: 'result', ts: 2, turnId: 'turn-a', seq: 2, traceType: 'tool_result', content: '',
        sourceEvent: 'historical', toolCallId: 'same', toolName: 'search_web',
        toolArgs: { query: 'late query' }, toolResult: 'done',
      }),
    ]);
    const context = buildToolCallContextIndex(groups);

    expect(context.get(toolCallIdentityKey({ turnId: 'turn-a', toolCallId: 'same' }))).toEqual({
      identity: { turnId: 'turn-a', toolCallId: 'same' },
      toolName: 'search_web',
      toolArgs: {},
    });
  });
});
