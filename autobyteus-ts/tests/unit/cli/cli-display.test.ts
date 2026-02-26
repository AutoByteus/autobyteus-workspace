import { describe, it, expect } from 'vitest';
import { InteractiveCliDisplay } from '../../../src/cli/agent/cli-display.js';
import { StreamEvent, StreamEventType } from '../../../src/agent/streaming/events/stream-events.js';
import { SegmentEventType, SegmentType } from '../../../src/agent/streaming/segments/segment-events.js';

class BufferWriter {
  writes: string[] = [];

  write(text: string): void {
    this.writes.push(text);
  }

  toString(): string {
    return this.writes.join('');
  }
}

describe('InteractiveCliDisplay', () => {
  it('renders reasoning segment events with thinking blocks', async () => {
    const writer = new BufferWriter();
    const display = new InteractiveCliDisplay({ writer, showToolLogs: false, showTokenUsage: false });

    await display.handleStreamEvent(
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.START,
          segment_id: 'seg-1',
          segment_type: SegmentType.REASONING,
          payload: {}
        }
      })
    );
    await display.handleStreamEvent(
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.CONTENT,
          segment_id: 'seg-1',
          payload: { delta: 'Thought.' }
        }
      })
    );
    await display.handleStreamEvent(
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.END,
          segment_id: 'seg-1'
        }
      })
    );

    expect(writer.toString()).toBe('Agent:\n<Thinking>\nThought.\n</Thinking>');
  });

  it('renders write_file segment events with metadata', async () => {
    const writer = new BufferWriter();
    const display = new InteractiveCliDisplay({ writer, showToolLogs: false, showTokenUsage: false });

    await display.handleStreamEvent(
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.START,
          segment_id: 'seg-2',
          segment_type: SegmentType.WRITE_FILE,
          payload: { metadata: { path: '/tmp/demo.txt' } }
        }
      })
    );
    await display.handleStreamEvent(
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.CONTENT,
          segment_id: 'seg-2',
          payload: { delta: 'hello' }
        }
      })
    );
    await display.handleStreamEvent(
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.END,
          segment_id: 'seg-2'
        }
      })
    );

    expect(writer.toString()).toBe('Agent:\n<write_file path="/tmp/demo.txt">\nhello\n</write_file>\n');
  });

  it('builds an approval prompt with arguments', async () => {
    const writer = new BufferWriter();
    const display = new InteractiveCliDisplay({ writer, showToolLogs: false, showTokenUsage: false });

    await display.handleStreamEvent(
      new StreamEvent({
        event_type: StreamEventType.TOOL_INVOCATION_APPROVAL_REQUESTED,
        data: {
          invocation_id: 'inv-1',
          tool_name: 'run_bash',
          arguments: { command: 'ls' }
        }
      })
    );

    const prompt = display.getApprovalPrompt() ?? '';
    expect(prompt).toContain("Tool Call: 'run_bash'");
    expect(prompt).toContain('"command": "ls"');
    expect(prompt).toContain('Approve? (y/n): ');
  });
});
