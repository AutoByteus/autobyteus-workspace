import { describe, it, expect } from 'vitest';
import { ParsingStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/parsing-streaming-response-handler.js';
import { SegmentEvent, SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { ChunkResponse } from '../../../../../src/llm/utils/response-types.js';

const chunk = (content: string): ChunkResponse => new ChunkResponse({ content });

describe('ParsingStreamingResponseHandler basics', () => {
  it('feed emits segment events', () => {
    const handler = new ParsingStreamingResponseHandler();
    const events = handler.feed(chunk('Hello world'));
    expect(events.length).toBeGreaterThan(0);
  });

  it('feed and finalize collects events', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(chunk('Test message'));
    handler.finalize();

    const allEvents = handler.getAllEvents();
    expect(allEvents.length).toBeGreaterThan(0);
  });

  it('double finalize returns empty list', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(chunk('test'));
    handler.finalize();
    const events = handler.finalize();
    expect(events).toEqual([]);
  });

  it('feed after finalize throws', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.finalize();
    expect(() => handler.feed(chunk('more data'))).toThrow();
  });
});

describe('ParsingStreamingResponseHandler callbacks', () => {
  it('onSegmentEvent is invoked for each event', () => {
    const received: SegmentEvent[] = [];
    const handler = new ParsingStreamingResponseHandler({
      onSegmentEvent: (event) => received.push(event)
    });

    handler.feed(chunk('Hello'));
    handler.finalize();

    expect(received.length).toBeGreaterThan(0);
    expect(received.every((e) => e instanceof SegmentEvent)).toBe(true);
  });

  it('onToolInvocation is invoked for tool segments', () => {
    const invocations: any[] = [];
    const handler = new ParsingStreamingResponseHandler({
      onToolInvocation: (inv) => invocations.push(inv)
    });

    handler.feed(chunk('<tool name="test_tool"><key>value</key></tool>'));
    handler.finalize();

    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('test_tool');
  });

  it('callback errors do not crash handler', () => {
    const handler = new ParsingStreamingResponseHandler({
      onSegmentEvent: () => {
        throw new Error('Callback error!');
      }
    });

    expect(() => {
      handler.feed(chunk('test'));
      handler.finalize();
    }).not.toThrow();
  });
});

describe('ParsingStreamingResponseHandler tool integration', () => {
  it('tool segment creates invocation with correct arguments', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(chunk('<tool name="read_file"><path>/test.py</path></tool>'));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('read_file');
    expect(invocations[0].arguments).toEqual({ path: '/test.py' });
  });

  it('multiple tool segments create multiple invocations', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(chunk('Some text <tool name="tool_a"><a>1</a></tool>'));
    handler.feed(chunk(' more text <tool name="tool_b"><b>2</b></tool>'));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(2);
  });

  it('segment_id matches invocation id', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(chunk('<tool name="test"></tool>'));
    handler.finalize();

    const events = handler.getAllEvents();
    const invocations = handler.getAllInvocations();

    const toolStart = events.find((e) => e.segment_type === SegmentType.TOOL_CALL && e.event_type === SegmentEventType.START);
    if (!toolStart) {
      throw new Error('Expected tool start event');
    }
    expect(invocations[0].id).toBe(toolStart.segment_id);
  });
});

describe('ParsingStreamingResponseHandler reset', () => {
  it('reset clears state and allows reuse', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(chunk('test data'));
    handler.finalize();

    expect(handler.getAllEvents().length).toBeGreaterThan(0);

    handler.reset();
    expect(handler.getAllEvents()).toHaveLength(0);
    expect(handler.getAllInvocations()).toHaveLength(0);

    handler.feed(chunk('new data'));
    handler.finalize();
    expect(handler.getAllEvents().length).toBeGreaterThan(0);
  });
});
