import { describe, it, expect } from 'vitest';
import { SegmentEvent, SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/parser/events.js';
import { ToolInvocationAdapter } from '../../../../../src/agent/streaming/parser/invocation-adapter.js';

describe('ToolInvocationAdapter basics', () => {
  it('creates invocation for complete tool segment', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_5', SegmentType.TOOL_CALL, { tool_name: 'read_file' }),
      SegmentEvent.content('seg_5', '<arguments><path>/src/main.py</path></arguments>'),
      new SegmentEvent({
        event_type: SegmentEventType.END,
        segment_id: 'seg_5',
        payload: { metadata: { tool_name: 'read_file' } }
      })
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].id).toBe('seg_5');
    expect(invocations[0].name).toBe('read_file');
    expect(invocations[0].arguments).toEqual({ path: '/src/main.py' });
  });

  it('uses segment_id as invocation id', () => {
    const adapter = new ToolInvocationAdapter();
    const start = SegmentEvent.start('my-unique-id-123', SegmentType.TOOL_CALL, { tool_name: 'write_file' });
    const end = new SegmentEvent({
      event_type: SegmentEventType.END,
      segment_id: 'my-unique-id-123',
      payload: { metadata: { tool_name: 'write_file' } }
    });

    adapter.processEvent(start);
    const result = adapter.processEvent(end);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('my-unique-id-123');
  });

  it('ignores non-tool segments', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_1', SegmentType.TEXT),
      SegmentEvent.content('seg_1', 'hello'),
      SegmentEvent.end('seg_1')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(0);
  });

  it('creates write_file invocation', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_2', SegmentType.WRITE_FILE, { path: '/test.py' }),
      SegmentEvent.content('seg_2', 'code'),
      SegmentEvent.end('seg_2')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('write_file');
    expect(invocations[0].arguments).toEqual({ path: '/test.py', content: 'code' });
  });

  it('creates run_bash invocation', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_3', SegmentType.RUN_BASH),
      SegmentEvent.content('seg_3', 'ls -la'),
      SegmentEvent.end('seg_3')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('run_bash');
    expect(invocations[0].arguments).toEqual({ command: 'ls -la' });
  });

  it('creates run_bash invocation with background metadata', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_3_bg', SegmentType.RUN_BASH, { background: true, timeout_seconds: 45 }),
      SegmentEvent.content('seg_3_bg', 'npm run dev'),
      SegmentEvent.end('seg_3_bg')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('run_bash');
    expect(invocations[0].arguments).toEqual({
      command: 'npm run dev',
      background: true,
      timeout_seconds: 45
    });
  });

  it('creates run_bash invocation with timeoutSeconds metadata alias', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_3_timeout_alias', SegmentType.RUN_BASH, { timeoutSeconds: 12 }),
      SegmentEvent.content('seg_3_timeout_alias', 'echo alias'),
      SegmentEvent.end('seg_3_timeout_alias')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('run_bash');
    expect(invocations[0].arguments).toEqual({
      command: 'echo alias',
      timeout_seconds: 12
    });
  });

  it('uses metadata.command when run_bash segment has empty body', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_3_command_meta', SegmentType.RUN_BASH, { command: 'pwd' }),
      SegmentEvent.end('seg_3_command_meta')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].arguments).toEqual({ command: 'pwd' });
  });

  it('uses metadata.cmd fallback when run_bash segment has empty body', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_3_cmd_meta', SegmentType.RUN_BASH, { cmd: 'whoami' }),
      SegmentEvent.end('seg_3_cmd_meta')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].arguments).toEqual({ command: 'whoami' });
  });

  it('content command takes precedence over metadata.command', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_3_precedence', SegmentType.RUN_BASH, { command: 'metadata command' }),
      SegmentEvent.content('seg_3_precedence', 'content command'),
      SegmentEvent.end('seg_3_precedence')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].arguments).toEqual({ command: 'content command' });
  });

  it('parses JSON tool call', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_json', SegmentType.TOOL_CALL),
      SegmentEvent.content('seg_json', '{"name": "search", "arguments": {"query": "autobyteus"}}'),
      SegmentEvent.end('seg_json')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('search');
    expect(invocations[0].arguments).toEqual({ query: 'autobyteus' });
  });

  it('creates multiple tool invocations', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_1', SegmentType.TOOL_CALL, { tool_name: 'tool_a' }),
      SegmentEvent.content('seg_1', '<arguments><x>1</x></arguments>'),
      new SegmentEvent({
        event_type: SegmentEventType.END,
        segment_id: 'seg_1',
        payload: { metadata: { tool_name: 'tool_a' } }
      }),
      SegmentEvent.start('seg_2', SegmentType.TOOL_CALL, { tool_name: 'tool_b' }),
      SegmentEvent.content('seg_2', '<arguments><y>2</y></arguments>'),
      new SegmentEvent({
        event_type: SegmentEventType.END,
        segment_id: 'seg_2',
        payload: { metadata: { tool_name: 'tool_b' } }
      })
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(2);
    expect(invocations[0].id).toBe('seg_1');
    expect(invocations[0].name).toBe('tool_a');
    expect(invocations[0].arguments).toEqual({ x: '1' });
    expect(invocations[1].id).toBe('seg_2');
    expect(invocations[1].name).toBe('tool_b');
    expect(invocations[1].arguments).toEqual({ y: '2' });
  });

  it('ignores write_file without path', () => {
    const adapter = new ToolInvocationAdapter();
    const events = [
      SegmentEvent.start('seg_x', SegmentType.WRITE_FILE),
      SegmentEvent.content('seg_x', 'code'),
      SegmentEvent.end('seg_x')
    ];

    const invocations = adapter.processEvents(events);
    expect(invocations).toHaveLength(0);
  });
});

describe('ToolInvocationAdapter state', () => {
  it('tracks active segments', () => {
    const adapter = new ToolInvocationAdapter();
    adapter.processEvent(SegmentEvent.start('seg_1', SegmentType.TOOL_CALL, { tool_name: 'test' }));
    expect(adapter.getActiveSegmentIds()).toContain('seg_1');

    adapter.processEvent(
      new SegmentEvent({
        event_type: SegmentEventType.END,
        segment_id: 'seg_1',
        payload: { metadata: { tool_name: 'test' } }
      })
    );
    expect(adapter.getActiveSegmentIds()).not.toContain('seg_1');
  });

  it('reset clears state', () => {
    const adapter = new ToolInvocationAdapter();
    adapter.processEvent(SegmentEvent.start('seg_1', SegmentType.TOOL_CALL, { tool_name: 'test' }));
    adapter.processEvent(SegmentEvent.start('seg_2', SegmentType.TOOL_CALL, { tool_name: 'test' }));
    expect(adapter.getActiveSegmentIds()).toHaveLength(2);

    adapter.reset();
    expect(adapter.getActiveSegmentIds()).toHaveLength(0);
  });
});

describe('ToolInvocationAdapter edge cases', () => {
  it('ignores end without start', () => {
    const adapter = new ToolInvocationAdapter();
    const result = adapter.processEvent(SegmentEvent.end('unknown_seg'));
    expect(result).toBeNull();
  });

  it('ignores content without start', () => {
    const adapter = new ToolInvocationAdapter();
    const result = adapter.processEvent(SegmentEvent.content('unknown_seg', 'data'));
    expect(result).toBeNull();
  });

  it('keeps incomplete segments active', () => {
    const adapter = new ToolInvocationAdapter();
    adapter.processEvent(SegmentEvent.start('seg_1', SegmentType.TOOL_CALL, { tool_name: 'test' }));
    adapter.processEvent(SegmentEvent.content('seg_1', 'content'));
    expect(adapter.getActiveSegmentIds()).toHaveLength(1);
  });
});
