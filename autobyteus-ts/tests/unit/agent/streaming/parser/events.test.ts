import { describe, it, expect } from 'vitest';
import { SegmentEvent, SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/parser/events.js';

describe('SegmentType', () => {
  it('exposes expected values', () => {
    expect(SegmentType.TEXT).toBe('text');
    expect(SegmentType.TOOL_CALL).toBe('tool_call');
    expect(SegmentType.WRITE_FILE).toBe('write_file');
    expect(SegmentType.EDIT_FILE).toBe('edit_file');
    expect(SegmentType.RUN_BASH).toBe('run_bash');
    expect(SegmentType.REASONING).toBe('reasoning');
    expect(SegmentType.MEDIA).toBe('media');
  });
});

describe('SegmentEventType', () => {
  it('exposes expected values', () => {
    expect(SegmentEventType.START).toBe('SEGMENT_START');
    expect(SegmentEventType.CONTENT).toBe('SEGMENT_CONTENT');
    expect(SegmentEventType.END).toBe('SEGMENT_END');
  });
});

describe('SegmentEvent', () => {
  it('creates start events with metadata', () => {
    const event = SegmentEvent.start('seg_001', SegmentType.TOOL_CALL, { tool_name: 'weather_api' });

    expect(event.event_type).toBe(SegmentEventType.START);
    expect(event.segment_id).toBe('seg_001');
    expect(event.segment_type).toBe(SegmentType.TOOL_CALL);
    expect(event.payload).toEqual({ metadata: { tool_name: 'weather_api' } });
  });

  it('creates start events without metadata', () => {
    const event = SegmentEvent.start('seg_002', SegmentType.TEXT);

    expect(event.event_type).toBe(SegmentEventType.START);
    expect(event.segment_id).toBe('seg_002');
    expect(event.segment_type).toBe(SegmentType.TEXT);
    expect(event.payload).toEqual({});
  });

  it('creates content events', () => {
    const event = SegmentEvent.content('seg_001', 'Hello world');

    expect(event.event_type).toBe(SegmentEventType.CONTENT);
    expect(event.segment_id).toBe('seg_001');
    expect(event.segment_type).toBeUndefined();
    expect(event.payload).toEqual({ delta: 'Hello world' });
  });

  it('creates end events', () => {
    const event = SegmentEvent.end('seg_001');

    expect(event.event_type).toBe(SegmentEventType.END);
    expect(event.segment_id).toBe('seg_001');
    expect(event.segment_type).toBeUndefined();
    expect(event.payload).toEqual({});
  });

  it('serializes start events with segment type', () => {
    const event = SegmentEvent.start('seg_001', SegmentType.WRITE_FILE, { path: '/tmp/test.py' });

    expect(event.toDict()).toEqual({
      type: 'SEGMENT_START',
      segment_id: 'seg_001',
      segment_type: 'write_file',
      payload: { metadata: { path: '/tmp/test.py' } }
    });
  });

  it('serializes content events without segment type', () => {
    const event = SegmentEvent.content('seg_001', 'code here');

    const result = event.toDict();
    expect(result).toEqual({
      type: 'SEGMENT_CONTENT',
      segment_id: 'seg_001',
      payload: { delta: 'code here' }
    });
    expect(result).not.toHaveProperty('segment_type');
  });

  it('serializes end events', () => {
    const event = SegmentEvent.end('seg_001');

    expect(event.toDict()).toEqual({
      type: 'SEGMENT_END',
      segment_id: 'seg_001',
      payload: {}
    });
  });
});
