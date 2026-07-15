import { describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';

const base = {
  id: 'rt_1',
  ts: 1,
  turnId: 'turn_1',
  seq: 1,
  traceType: 'tool_call',
  content: '',
  sourceEvent: 'test',
  toolName: 'no_output_tool',
  toolCallId: 'call_1',
  toolArgs: {},
};

describe('RawTraceItem outcome presence', () => {
  it('preserves missing outcomes for historical pending calls', () => {
    const trace = new RawTraceItem(base);
    expect(trace.toDict()).not.toHaveProperty('tool_result');
    expect(trace.toDict()).not.toHaveProperty('tool_error');

    const roundTrip = RawTraceItem.fromDict(trace.toDict());
    expect(roundTrip.toolResult).toBeUndefined();
    expect(roundTrip.toolError).toBeUndefined();
  });

  it('keeps historical name-less results readable with explicit null outcomes', () => {
    const trace = new RawTraceItem({
      ...base,
      traceType: 'tool_result',
      toolName: null,
      toolArgs: null,
      toolResult: null,
      toolError: null,
    });
    expect(trace.toDict()).toMatchObject({
      trace_type: 'tool_result',
      tool_call_id: 'call_1',
      tool_result: null,
      tool_error: null,
    });
    expect(trace.toDict()).not.toHaveProperty('tool_name');
    expect(trace.toDict()).not.toHaveProperty('tool_args');

    const roundTrip = RawTraceItem.fromDict(trace.toDict());
    expect(roundTrip.toolResult).toBeNull();
    expect(roundTrip.toolError).toBeNull();
  });

  it('does not add outcome keys to non-tool records', () => {
    const trace = new RawTraceItem({
      id: 'rt_user', ts: 1, turnId: 'turn_1', seq: 1,
      traceType: 'user', content: 'hello', sourceEvent: 'test',
    });
    expect(trace.toDict()).not.toHaveProperty('tool_result');
    expect(trace.toDict()).not.toHaveProperty('tool_error');
  });
});
