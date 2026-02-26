import { describe, it, expect } from 'vitest';
import {
  SegmentEvent,
  SegmentEventType,
  SegmentType
} from '../../../../../src/agent/streaming/segments/segment-events.js';

describe('SegmentEvent', () => {
  it('builds start/content/end helpers with expected payloads', () => {
    const start = SegmentEvent.start('seg-1', SegmentType.TEXT, { foo: 'bar' });
    expect(start.event_type).toBe(SegmentEventType.START);
    expect(start.segment_id).toBe('seg-1');
    expect(start.segment_type).toBe(SegmentType.TEXT);
    expect(start.payload).toEqual({ metadata: { foo: 'bar' } });
    expect(start.toDict()).toEqual({
      type: SegmentEventType.START,
      segment_id: 'seg-1',
      segment_type: SegmentType.TEXT,
      payload: { metadata: { foo: 'bar' } }
    });

    const content = SegmentEvent.content('seg-1', 'hello');
    expect(content.event_type).toBe(SegmentEventType.CONTENT);
    expect(content.payload).toEqual({ delta: 'hello' });
    expect(content.toDict()).toEqual({
      type: SegmentEventType.CONTENT,
      segment_id: 'seg-1',
      payload: { delta: 'hello' }
    });

    const end = SegmentEvent.end('seg-1');
    expect(end.event_type).toBe(SegmentEventType.END);
    expect(end.payload).toEqual({});
    expect(end.toDict()).toEqual({
      type: SegmentEventType.END,
      segment_id: 'seg-1',
      payload: {}
    });
  });
});
