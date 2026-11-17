import { describe, expect, it } from 'vitest';
import { LlmStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/llm-streaming-response-handler.js';
import { SegmentEventType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { ChunkResponse } from '../../../../../src/llm/utils/response-types.js';

const TURN_ID = 'turn_call_tool';
const nativeContext = { provider: 'anthropic', block: { type: 'tool_use', id: 'toolu_1', name: 'call_tool' } } as never;

/** One streamed call_tool call, its arguments split over two deltas as providers stream them. */
const streamCallTool = (handler: LlmStreamingResponseHandler, args: string) => {
  handler.feed(new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: 'call_1', name: 'call_tool', arguments_delta: args.slice(0, 10), native_context: nativeContext }] }));
  handler.feed(new ChunkResponse({ content: '', tool_calls: [{ index: 0, arguments_delta: args.slice(10) }] }));
  handler.finalize();
};
const segmentEvents = (handler: LlmStreamingResponseHandler, type: SegmentEventType) =>
  handler.getAllEvents().filter((event) => event.event_type === type && event.segment_id === 'call_1');

describe('LlmStreamingResponseHandler: a call through call_tool (DS-002)', () => {
  const wellFormed = JSON.stringify({ name: 'update_task', arguments: { task_id: 'autobyteus-77', status: 'DONE' } });

  it('becomes the real tool\'s invocation at stream end, and END names the real tool and its arguments', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true, toolSearchEnabled: true });
    streamCallTool(handler, wellFormed);

    const [invocation] = handler.getAllInvocations();
    expect(invocation).toMatchObject({
      id: 'call_1',
      name: 'update_task',
      arguments: { task_id: 'autobyteus-77', status: 'DONE' },
      turnId: TURN_ID,
      calledThrough: 'call_tool',
      argumentsParseError: null,
    });
    expect(invocation!.nativeToolCallContext).toBe(nativeContext);

    // The card shows call_tool while the arguments stream, then the real tool from END on.
    expect(segmentEvents(handler, SegmentEventType.START)[0]!.payload.metadata.tool_name).toBe('call_tool');
    expect(segmentEvents(handler, SegmentEventType.END)[0]!.payload.metadata).toMatchObject({
      tool_name: 'update_task',
      arguments: { task_id: 'autobyteus-77', status: 'DONE' },
      native_tool_call_context: nativeContext,
    });
  });

  it('keeps a malformed call_tool call as a call_tool invocation (the call_tool tool answers it)', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true, toolSearchEnabled: true });
    streamCallTool(handler, JSON.stringify({ name: 'update_task', arguments: '{"task_id":"x"}' }));

    expect(handler.getAllInvocations()[0]).toMatchObject({ name: 'call_tool', calledThrough: null });
    expect(segmentEvents(handler, SegmentEventType.END)[0]!.payload.metadata.tool_name).toBe('call_tool');
  });

  it('converts nothing when the request carried no tool search', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true, toolSearchEnabled: false });
    streamCallTool(handler, wellFormed);

    expect(handler.getAllInvocations()[0]).toMatchObject({ name: 'call_tool', calledThrough: null });
  });
});
