import { describe, it, expect } from 'vitest';
import { ApiToolCallStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { SegmentEvent, SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { ChunkResponse } from '../../../../../src/llm/utils/response-types.js';

describe('ApiToolCallStreamingResponseHandler basics', () => {
  it('emits text segments for content', () => {
    const handler = new ApiToolCallStreamingResponseHandler();
    const events = handler.feed(new ChunkResponse({ content: 'Hello world' }));

    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe(SegmentEventType.START);
    expect(events[0].segment_type).toBe(SegmentType.TEXT);
    expect(events[1].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[1].payload.delta).toBe('Hello world');
  });

  it('emits write_file segments from tool calls', () => {
    const handler = new ApiToolCallStreamingResponseHandler();

    const events1 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_123',
            name: 'write_file',
            arguments_delta: '{"path":"test.txt","content":"h'
          }
        ]
      })
    );

    const events2 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            arguments_delta: 'i"}'
          }
        ]
      })
    );

    const startEvent = events1.find((event) => event.event_type === SegmentEventType.START);
    expect(startEvent).toBeDefined();
    expect(startEvent!.segment_type).toBe(SegmentType.WRITE_FILE);
    expect(startEvent!.payload.metadata.path).toBe('test.txt');

    const firstContent = events1.find((event) => event.event_type === SegmentEventType.CONTENT);
    expect(firstContent!.payload.delta).toBe('h');
    expect(events2[0].event_type).toBe(SegmentEventType.CONTENT);
    expect(events2[0].payload.delta).toBe('i');
  });

  it('finalize creates invocations from accumulated args', () => {
    const handler = new ApiToolCallStreamingResponseHandler();

    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, call_id: 'call_abc', name: 'write_file' }]
      })
    );
    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          { index: 0, arguments_delta: '{"path": "hello.py", "content": "print()"}' }
        ]
      })
    );
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('write_file');
    expect(invocations[0].arguments).toEqual({ path: 'hello.py', content: 'print()' });
    expect(invocations[0].id).toBe('call_abc');
  });
});

describe('ApiToolCallStreamingResponseHandler parallel tool calls', () => {
  it('tracks multiple tool calls by index', () => {
    const handler = new ApiToolCallStreamingResponseHandler();

    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          { index: 0, call_id: 'call_write', name: 'write_file' },
          { index: 1, call_id: 'call_bash', name: 'run_bash' }
        ]
      })
    );

    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, arguments_delta: '{"path": "test.py"}' }]
      })
    );

    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 1, arguments_delta: '{"command": "python test.py"}' }]
      })
    );

    handler.finalize();
    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(2);

    const writeInv = invocations.find((inv) => inv.name === 'write_file');
    const bashInv = invocations.find((inv) => inv.name === 'run_bash');

    expect(writeInv).toBeDefined();
    expect(bashInv).toBeDefined();
    expect(writeInv!.arguments).toEqual({ path: 'test.py', content: '' });
    expect(bashInv!.arguments).toEqual({ command: 'python test.py' });
  });
});

describe('ApiToolCallStreamingResponseHandler file streaming', () => {
  it('emits edit_file segments', () => {
    const handler = new ApiToolCallStreamingResponseHandler();

    const events1 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_patch',
            name: 'edit_file',
            arguments_delta: '{"path":"a.txt","patch":"@@ -1 +1 @@'
          }
        ]
      })
    );

    const events2 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, arguments_delta: '\\n-foo"}' }]
      })
    );

    const startEvent = events1.find((event) => event.event_type === SegmentEventType.START);
    expect(startEvent!.segment_type).toBe(SegmentType.EDIT_FILE);
    expect(startEvent!.payload.metadata.path).toBe('a.txt');
    const firstContent = events1.find((event) => event.event_type === SegmentEventType.CONTENT);
    expect(firstContent!.payload.delta).toBe('@@ -1 +1 @@');
    expect(events2[0].payload.delta).toBe('\n-foo');
  });

  it('defers write_file start until path available', () => {
    const handler = new ApiToolCallStreamingResponseHandler();

    const events1 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_defer',
            name: 'write_file',
            arguments_delta: '{"content":"Hello'
          }
        ]
      })
    );

    expect(events1).toEqual([]);

    const events2 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, arguments_delta: ' world","path":"deferred.txt"}' }]
      })
    );

    const startEvent = events2.find((event) => event.event_type === SegmentEventType.START);
    expect(startEvent!.segment_type).toBe(SegmentType.WRITE_FILE);
    expect(startEvent!.payload.metadata.path).toBe('deferred.txt');
    const contentDeltas = events2
      .filter((event) => event.event_type === SegmentEventType.CONTENT)
      .map((event) => event.payload.delta);
    expect(contentDeltas.join('')).toBe('Hello world');
  });

  it('decodes escaped content', () => {
    const handler = new ApiToolCallStreamingResponseHandler();

    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_write',
            name: 'write_file',
            arguments_delta: '{"path":"a.txt","content":"hi\\\\'
          }
        ]
      })
    );
    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, arguments_delta: 'nthere"}' }]
      })
    );

    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].arguments).toEqual({ path: 'a.txt', content: 'hi\\nthere' });
  });
});

describe('ApiToolCallStreamingResponseHandler callbacks', () => {
  it('invokes onSegmentEvent callback', () => {
    const received: SegmentEvent[] = [];
    const handler = new ApiToolCallStreamingResponseHandler({
      onSegmentEvent: (event) => received.push(event)
    });
    handler.feed(new ChunkResponse({ content: 'Hello' }));
    handler.finalize();
    expect(received.length).toBeGreaterThan(0);
    expect(received.every((event) => event instanceof SegmentEvent)).toBe(true);
  });

  it('invokes onToolInvocation callback', () => {
    const invocations: any[] = [];
    const handler = new ApiToolCallStreamingResponseHandler({
      onToolInvocation: (invocation) => invocations.push(invocation)
    });

    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, call_id: 'call_x', name: 'test' }]
      })
    );
    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, arguments_delta: '{}' }]
      })
    );
    handler.finalize();

    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('test');
  });
});

describe('ApiToolCallStreamingResponseHandler reset', () => {
  it('reset clears state', () => {
    const handler = new ApiToolCallStreamingResponseHandler();
    handler.feed(new ChunkResponse({ content: 'test' }));
    handler.finalize();

    expect(handler.getAllEvents().length).toBeGreaterThan(0);

    handler.reset();
    expect(handler.getAllEvents()).toHaveLength(0);
    expect(handler.getAllInvocations()).toHaveLength(0);

    handler.feed(new ChunkResponse({ content: 'new data' }));
    handler.finalize();
    expect(handler.getAllEvents().length).toBeGreaterThan(0);
  });

  it('feed after finalize throws', () => {
    const handler = new ApiToolCallStreamingResponseHandler();
    handler.finalize();

    expect(() => handler.feed(new ChunkResponse({ content: 'data' }))).toThrow();
  });
});
