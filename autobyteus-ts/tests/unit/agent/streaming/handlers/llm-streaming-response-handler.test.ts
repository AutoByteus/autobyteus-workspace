import { describe, it, expect } from 'vitest';
import { LlmStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/llm-streaming-response-handler.js';
import { SegmentEvent, SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { ChunkResponse } from '../../../../../src/llm/utils/response-types.js';
import { convertGeminiToolCalls } from '../../../../../src/llm/converters/gemini-tool-call-converter.js';

const TURN_ID = 'turn_test';

describe('LlmStreamingResponseHandler basics', () => {
  it('emits text segments for content', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    const events = handler.feed(new ChunkResponse({ content: 'Hello world' }));

    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe(SegmentEventType.START);
    expect(events[0].segment_type).toBe(SegmentType.TEXT);
    expect(events[1].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[1].payload.delta).toBe('Hello world');
  });

  it.each([
    '<tool name="run_bash"><arguments><command>echo unsafe</command></arguments></tool>',
    '{"tool":"run_bash","arguments":{"command":"echo unsafe"}}',
    '[[SEG_START tool]] run_bash {"command":"echo unsafe"} [[SEG_END tool]]',
    '[TOOL_CALL] run_bash {"command":"echo unsafe"}'
  ])('treats legacy-looking assistant text as content and creates zero invocations: %s', (content) => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });

    handler.feed(new ChunkResponse({ content }));
    handler.finalize();

    expect(handler.getAllInvocations()).toEqual([]);
    expect(handler.getAllEvents().find(
      (event) => event.event_type === SegmentEventType.CONTENT
    )?.payload.delta).toBe(content);
  });

  it('emits write_file segments from tool calls', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });

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
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });

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

  it('finalizeInterrupted closes active text and tool-call segments without creating invocations', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.feed(new ChunkResponse({ content: 'partial assistant text' }));
    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_partial',
            name: 'search_web',
            arguments_delta: '{"query":"unfinished'
          }
        ]
      })
    );

    const events = handler.finalizeInterrupted('user_interrupt');

    const endEvents = events.filter((event) => event.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(2);
    expect(endEvents.every((event) => event.payload.interrupted === true)).toBe(true);
    expect(endEvents.every((event) => event.payload.reason === 'user_interrupt')).toBe(true);
    const toolEnd = endEvents.find((event) => event.segment_id === 'call_partial');
    expect(toolEnd?.payload.metadata.tool_name).toBe('search_web');
    expect(handler.getAllInvocations()).toEqual([]);
  });

  it('finalizeFailed closes active text and tool-call segments without creating invocations', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.feed(new ChunkResponse({ content: 'partial assistant text' }));
    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_failed_partial',
            name: 'search_web',
            arguments_delta: '{"query":"unfinished'
          }
        ]
      })
    );

    const events = handler.finalizeFailed('stream failed');

    const endEvents = events.filter((event) => event.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(2);
    expect(endEvents.every((event) => event.payload.failed === true)).toBe(true);
    expect(endEvents.every((event) => event.payload.error === 'stream failed')).toBe(true);
    const toolEnd = endEvents.find((event) => event.segment_id === 'call_failed_partial');
    expect(toolEnd?.payload.metadata.tool_name).toBe('search_web');
    expect(handler.getAllInvocations()).toEqual([]);
  });

  it('carries provider-native context from deltas to tool invocations', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    const nativeContext = {
      provider: 'openai_responses' as const,
      functionCallItem: { type: 'function_call', call_id: 'call_ctx', name: 'test' }
    };

    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, call_id: 'call_ctx', name: 'test', native_context: nativeContext }]
      })
    );
    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, arguments_delta: '{}' }]
      })
    );
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].nativeToolCallContext).toEqual(nativeContext);
  });
});

describe('LlmStreamingResponseHandler with tool calls disabled', () => {
  it('streams ordinary and tool-looking text while ignoring unexpected native tool deltas', () => {
    const handler = new LlmStreamingResponseHandler({
      turnId: TURN_ID,
      toolCallsEnabled: false
    });
    const content = '<tool name="run_bash">not a protocol</tool>';

    const events = handler.feed(new ChunkResponse({
      content,
      tool_calls: [{
        index: 0,
        call_id: 'unexpected-call',
        name: 'run_bash',
        arguments_delta: '{"command":"echo unsafe"}'
      }]
    }));
    const finalEvents = handler.finalize();

    expect(events.map((event) => event.segment_type)).toEqual([
      SegmentType.TEXT,
      undefined
    ]);
    expect(events[1].payload.delta).toBe(content);
    expect(finalEvents).toHaveLength(1);
    expect(finalEvents[0]).toMatchObject({
      event_type: SegmentEventType.END
    });
    expect(handler.getAllEvents().some((event) =>
      event.segment_type === SegmentType.TOOL_CALL
      || event.segment_type === SegmentType.WRITE_FILE
      || event.segment_type === SegmentType.EDIT_FILE
    )).toBe(false);
    expect(handler.getAllInvocations()).toEqual([]);
  });

  it('preserves text interruption semantics without publishing an invocation', () => {
    const handler = new LlmStreamingResponseHandler({
      turnId: TURN_ID,
      toolCallsEnabled: false
    });

    handler.feed(new ChunkResponse({ content: 'partial' }));
    const events = handler.finalizeInterrupted('user_interrupt');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event_type: SegmentEventType.END,
      payload: { interrupted: true, reason: 'user_interrupt' }
    });
    expect(handler.getAllInvocations()).toEqual([]);
  });
});

describe('LlmStreamingResponseHandler parallel tool calls', () => {
  it('tracks multiple tool calls by index', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });

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
    expect(writeInv!.arguments).toEqual({ path: 'test.py' });
    expect(writeInv!.turnId).toBe(TURN_ID);
    expect(writeInv!.id).toBe('call_write');
    expect(bashInv!.arguments).toEqual({ command: 'python test.py' });
    expect(bashInv!.turnId).toBe(TURN_ID);
    expect(bashInv!.id).toBe('call_bash');
  });

  it('keeps multiple Gemini functionCall parts as distinct invocations', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    const firstCall = convertGeminiToolCalls({
      functionCall: { id: 'call_a', name: 'get_weather', args: { city: 'Berlin' } }
    }, 0)!;
    const secondCall = convertGeminiToolCalls({
      functionCall: { id: 'call_b', name: 'get_time', args: { city: 'Berlin' } }
    }, 1)!;

    handler.feed(new ChunkResponse({
      content: '',
      tool_calls: [...firstCall, ...secondCall]
    }));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations.map((invocation) => invocation.id)).toEqual(['call_a', 'call_b']);
    expect(invocations.map((invocation) => invocation.name)).toEqual(['get_weather', 'get_time']);
    expect(invocations.map((invocation) => invocation.arguments)).toEqual([
      { city: 'Berlin' },
      { city: 'Berlin' }
    ]);
  });
});

describe('LlmStreamingResponseHandler file streaming', () => {
  it('emits edit_file segments', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });

    const events1 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_patch',
            name: 'edit_file',
            arguments_delta: '{"path":"a.txt","patch":"@@'
          }
        ]
      })
    );

    const events2 = handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [{ index: 0, arguments_delta: '\\n-old\\n+new"}' }]
      })
    );

    const startEvent = events1.find((event) => event.event_type === SegmentEventType.START);
    expect(startEvent!.segment_type).toBe(SegmentType.EDIT_FILE);
    expect(startEvent!.payload.metadata.path).toBe('a.txt');
    const firstContent = events1.find((event) => event.event_type === SegmentEventType.CONTENT);
    expect(firstContent!.payload.delta).toBe('@@');
    expect(events2[0].payload.delta).toBe('\n-old\n+new');
  });

  it('defers write_file start until path available', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });

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
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });

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

  it('finalizeInterrupted closes active write_file segment with path metadata without creating an invocation', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.feed(
      new ChunkResponse({
        content: '',
        tool_calls: [
          {
            index: 0,
            call_id: 'call_write_partial',
            name: 'write_file',
            arguments_delta: '{"path":"partial.txt","content":"hello'
          }
        ]
      })
    );

    const events = handler.finalizeInterrupted('user_interrupt');

    const endEvent = events.find((event) => event.event_type === SegmentEventType.END);
    expect(endEvent).toBeDefined();
    expect(endEvent?.segment_id).toBe('call_write_partial');
    expect(endEvent?.payload).toMatchObject({
      interrupted: true,
      reason: 'user_interrupt',
      metadata: {
        tool_name: 'write_file',
        path: 'partial.txt'
      }
    });
    expect(handler.getAllInvocations()).toEqual([]);
  });
});

describe('LlmStreamingResponseHandler callbacks', () => {
  it('invokes onSegmentEvent callback', () => {
    const received: SegmentEvent[] = [];
    const handler = new LlmStreamingResponseHandler({
      turnId: TURN_ID,
      toolCallsEnabled: true,
      onSegmentEvent: (event) => received.push(event)
    });
    handler.feed(new ChunkResponse({ content: 'Hello' }));
    handler.finalize();
    expect(received.length).toBeGreaterThan(0);
    expect(received.every((event) => event instanceof SegmentEvent)).toBe(true);
  });

  it('invokes onToolInvocation callback', () => {
    const invocations: any[] = [];
    const handler = new LlmStreamingResponseHandler({
      turnId: TURN_ID,
      toolCallsEnabled: true,
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

  it('emits the tool segment end before publishing the finalized invocation', () => {
    const callbackOrder: string[] = [];
    const handler = new LlmStreamingResponseHandler({
      turnId: TURN_ID,
      toolCallsEnabled: true,
      onSegmentEvent: (event) => callbackOrder.push(`segment:${event.event_type}`),
      onToolInvocation: () => callbackOrder.push('invocation')
    });

    handler.feed(new ChunkResponse({
      content: '',
      tool_calls: [{ index: 0, call_id: 'call_order', name: 'test', arguments_delta: '{}' }]
    }));
    handler.finalize();

    expect(callbackOrder).toEqual([
      `segment:${SegmentEventType.START}`,
      `segment:${SegmentEventType.CONTENT}`,
      `segment:${SegmentEventType.END}`,
      'invocation'
    ]);
  });
});

describe('LlmStreamingResponseHandler reset', () => {
  it('reset clears state', () => {
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
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
    const handler = new LlmStreamingResponseHandler({ turnId: TURN_ID, toolCallsEnabled: true });
    handler.finalize();

    expect(() => handler.feed(new ChunkResponse({ content: 'data' }))).toThrow();
  });
});
