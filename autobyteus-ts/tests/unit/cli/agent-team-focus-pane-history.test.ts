import { describe, it, expect } from 'vitest';
import { buildHistoryLines } from '../../../src/cli/agent-team/widgets/focus-pane-history.js';
import { StreamEvent, StreamEventType } from '../../../src/agent/streaming/events/stream-events.js';
import { SegmentEventType, SegmentType } from '../../../src/agent/streaming/segments/segment-events.js';

describe('buildHistoryLines', () => {
  it('renders user messages from UI history', () => {
    const lines = buildHistoryLines([
      { event_type: 'ui_user_message', data: { content: 'Hello team' } }
    ]);

    expect(lines.join('\n')).toContain('You: Hello team');
  });

  it('renders segment tags with metadata and skips duplicate assistant complete', () => {
    const events = [
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.START,
          segment_id: 'seg-1',
          segment_type: SegmentType.WRITE_FILE,
          payload: { metadata: { path: '/tmp/demo.txt' } }
        }
      }),
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.CONTENT,
          segment_id: 'seg-1',
          payload: { delta: 'hello' }
        }
      }),
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.END,
          segment_id: 'seg-1'
        }
      }),
      new StreamEvent({
        event_type: StreamEventType.ASSISTANT_COMPLETE_RESPONSE,
        data: { content: 'final', reasoning: '' }
      })
    ];

    const lines = buildHistoryLines(events);
    const output = lines.join('\n');
    expect(output).toContain('<write_file path="/tmp/demo.txt">');
    expect(output).toContain('hello');
    expect(output).toContain('</write_file>');
    expect(output).not.toContain('assistant: final');
  });

  it('renders assistant complete when no segment events are present', () => {
    const lines = buildHistoryLines([
      new StreamEvent({
        event_type: StreamEventType.ASSISTANT_COMPLETE_RESPONSE,
        data: { content: 'Hello', reasoning: 'Thinking' }
      })
    ]);

    expect(lines.join('\n')).toContain('assistant: Hello');
    expect(lines.join('\n')).toContain('<Thinking>');
  });

  it('renders tool call metadata', () => {
    const lines = buildHistoryLines([
      new StreamEvent({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: SegmentEventType.START,
          segment_id: 'seg-2',
          segment_type: SegmentType.TOOL_CALL,
          payload: { metadata: { tool_name: 'search_web' } }
        }
      })
    ]);

    expect(lines.join('\n')).toContain('<tool name="search_web">');
  });
});
