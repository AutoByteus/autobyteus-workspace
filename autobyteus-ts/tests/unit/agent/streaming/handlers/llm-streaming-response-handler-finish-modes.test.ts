import { describe, expect, it } from 'vitest';
import { LlmStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/llm-streaming-response-handler.js';
import { SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { ChunkResponse } from '../../../../../src/llm/utils/response-types.js';

const TURN_ID = 'turn_test';

const toolChunk = (index: number, callId: string, name: string, argumentsDelta: string) =>
  new ChunkResponse({ content: '', tool_calls: [{ index, call_id: callId, name, arguments_delta: argumentsDelta }] });

describe('LlmStreamingResponseHandler tool-argument validity (REQ-011)', () => {
  it.each([
    ['invalid JSON', '{"city": Berlin', /JSON/],
    ['a JSON array', '["Berlin"]', /not a JSON object/],
    ['a JSON string', '"Berlin"', /not a JSON object/],
  ])('marks %s arguments instead of inventing {}', (_label, rawArgs, expectedError) => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.feed(toolChunk(0, 'call_bad', 'get_weather', rawArgs));
    handler.finalize();

    const [invocation] = handler.getAllInvocations();
    expect(invocation!.argumentsParseError).toMatch(expectedError);
    expect(invocation!.arguments).toEqual({});
  });

  it('keeps valid and empty argument payloads unmarked', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.feed(toolChunk(0, 'call_ok', 'get_weather', '{"city":"Berlin"}'));
    handler.feed(toolChunk(1, 'call_empty', 'list_files', ''));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations.map((invocation) => invocation.argumentsParseError)).toEqual([null, null]);
    expect(invocations[0]!.arguments).toEqual({ city: 'Berlin' });
    expect(invocations[1]!.arguments).toEqual({});
  });
});

describe('LlmStreamingResponseHandler.finalizeOutputLimited (D-04)', () => {
  it('ends text normally, fails started tool segments as discarded, records no invocation, returns the tool names', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.feed(new ChunkResponse({ content: 'Writing the file now.' }));
    handler.feed(toolChunk(0, 'call_cut', 'get_weather', '{"city":"Ber'));
    handler.feed(toolChunk(1, 'call_cut_2', 'write_file', '{"path":"a.md","content":"# Ti'));

    const names = handler.finalizeOutputLimited('Discarded: the output limit was reached.');

    expect(names).toEqual(['get_weather', 'write_file']);
    expect(handler.getAllInvocations()).toEqual([]);
    const ends = handler.getAllEvents().filter((event) => event.event_type === SegmentEventType.END);
    const textEnd = ends.find((event) => event.segment_id !== 'call_cut' && event.segment_id !== 'call_cut_2');
    expect(textEnd?.payload).toEqual({});
    const toolEnd = ends.find((event) => event.segment_id === 'call_cut');
    expect(toolEnd?.payload).toMatchObject({ failed: true, error: 'Discarded: the output limit was reached.' });
    expect(handler.getAllEvents().find((event) => event.segment_id === 'call_cut_2')?.segment_type)
      .toBe(SegmentType.WRITE_FILE);
    expect(handler.finalizeOutputLimited('again')).toEqual([]);
    expect(() => handler.feed(new ChunkResponse({ content: 'late' }))).toThrow();
  });

  it('returns no names for a text-only cut', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.feed(new ChunkResponse({ content: 'Long answer' }));
    expect(handler.finalizeOutputLimited('x')).toEqual([]);
  });
});
