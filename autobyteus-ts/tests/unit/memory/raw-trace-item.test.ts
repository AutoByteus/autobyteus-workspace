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


describe('optional native accepted-input identity codec', () => {
  it('round trips only recognized user identity without overloading trace or sender identity', () => {
    const item = new RawTraceItem({ ...base, traceType: 'user', messageId: ' A ', dedupeKey: ' token ', senderId: 'sender', correlationId: 'correlation' });
    const row = item.toDict();
    expect(row).toMatchObject({ message_id: 'A', dedupe_key: 'token', id: 'rt_1', turn_id: 'turn_1', sender_id: 'sender', correlation_id: 'correlation' });
    expect(RawTraceItem.fromDict(JSON.parse(JSON.stringify(row))).toDict()).toEqual(row);
  });
  it.each([undefined, null, '', '  ', 42, {}, []])('treats malformed/absent optional keys %j as unknown', key => {
    const row = { ...new RawTraceItem({ ...base, traceType: 'user' }).toDict(), message_id: key, dedupe_key: key };
    const parsed = RawTraceItem.fromDict(row).toDict();
    expect(parsed).not.toHaveProperty('message_id'); expect(parsed).not.toHaveProperty('dedupe_key');
  });
  it.each(['assistant', 'tool_call', 'reasoning'])('does not introduce input keys to %s', traceType => {
    expect(new RawTraceItem({ ...base, traceType, messageId: 'A', dedupeKey: 'token' }).toDict()).not.toHaveProperty('message_id');
  });
});
