import { describe, it, expect } from 'vitest';
import { PassThroughStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/pass-through-streaming-response-handler.js';
import { SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { ChunkResponse } from '../../../../../src/llm/utils/response-types.js';

const chunk = (content: string) => new ChunkResponse({ content });

describe('PassThroughStreamingResponseHandler', () => {
  it('feed creates start and content events', () => {
    const handler = new PassThroughStreamingResponseHandler();
    const events = handler.feed(chunk('Hello'));

    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe(SegmentEventType.START);
    expect(events[0].segment_type).toBe(SegmentType.TEXT);
    expect(events[1].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[1].payload.delta).toBe('Hello');
  });

  it('subsequent feed creates only content', () => {
    const handler = new PassThroughStreamingResponseHandler();
    handler.feed(chunk('Hello'));
    const events = handler.feed(chunk(' World'));

    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[0].payload.delta).toBe(' World');
  });

  it('treats legacy tags as raw text', () => {
    const handler = new PassThroughStreamingResponseHandler();
    const events = handler.feed(chunk('<write_file>'));

    expect(events).toHaveLength(2);
    expect(events[1].payload.delta).toBe('<write_file>');
    expect(handler.getAllInvocations()).toEqual([]);
  });

  it('finalize emits end event', () => {
    const handler = new PassThroughStreamingResponseHandler();
    handler.feed(chunk('test'));
    const events = handler.finalize();

    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe(SegmentEventType.END);
  });

  it('getAllInvocations is empty', () => {
    const handler = new PassThroughStreamingResponseHandler();
    handler.feed(chunk('<tool name="foo"></tool>'));
    handler.finalize();

    expect(handler.getAllInvocations()).toEqual([]);
    const events = handler.getAllEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    expect(contentEvents[0].payload.delta).toBe('<tool name="foo"></tool>');
  });
});
