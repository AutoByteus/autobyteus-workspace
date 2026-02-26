import { describe, it, expect } from 'vitest';
import { EventEmitter } from '../../../../../src/agent/streaming/parser/event-emitter.js';
import { SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/parser/events.js';

describe('EventEmitter basics', () => {
  it('emits full segment lifecycle', () => {
    const emitter = new EventEmitter();

    const segId = emitter.emitSegmentStart(SegmentType.TEXT);
    expect(segId).toBe('seg_1');
    expect(emitter.getCurrentSegmentId()).toBe('seg_1');

    emitter.emitSegmentContent('Hello');
    expect(emitter.getCurrentSegmentContent()).toBe('Hello');

    const endedId = emitter.emitSegmentEnd();
    expect(endedId).toBe('seg_1');
    expect(emitter.getCurrentSegmentId()).toBeUndefined();

    const events = emitter.getAndClearEvents();
    expect(events).toHaveLength(3);
  });

  it('generates unique segment ids', () => {
    const emitter = new EventEmitter();
    const id1 = emitter.emitSegmentStart(SegmentType.TEXT);
    emitter.emitSegmentEnd();
    const id2 = emitter.emitSegmentStart(SegmentType.WRITE_FILE);
    emitter.emitSegmentEnd();

    expect(id1).toBe('seg_1');
    expect(id2).toBe('seg_2');
  });

  it('throws when emitting content without active segment', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.emitSegmentContent('test')).toThrow(/Cannot emit content/);
  });

  it('returns undefined when ending without active segment', () => {
    const emitter = new EventEmitter();
    const result = emitter.emitSegmentEnd();
    expect(result).toBeUndefined();
  });
});

describe('EventEmitter metadata', () => {
  it('captures metadata on start', () => {
    const emitter = new EventEmitter();
    emitter.emitSegmentStart(SegmentType.WRITE_FILE, { path: '/test.py' });
    expect(emitter.getCurrentSegmentMetadata()).toEqual({ path: '/test.py' });
  });

  it('updates metadata', () => {
    const emitter = new EventEmitter();
    emitter.emitSegmentStart(SegmentType.TOOL_CALL, { tool_name: 'test' });
    emitter.updateCurrentSegmentMetadata({ arg1: 'value1' });
    expect(emitter.getCurrentSegmentMetadata()).toEqual({ tool_name: 'test', arg1: 'value1' });
  });
});

describe('EventEmitter text helper', () => {
  it('appendTextSegment emits start + content', () => {
    const emitter = new EventEmitter();
    emitter.appendTextSegment('Hello World');
    const events = emitter.getAndClearEvents();
    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe(SegmentEventType.START);
    expect(events[1].event_type).toBe(SegmentEventType.CONTENT);
  });

  it('appendTextSegment ignores empty text', () => {
    const emitter = new EventEmitter();
    emitter.appendTextSegment('');
    const events = emitter.getAndClearEvents();
    expect(events).toHaveLength(0);
  });
});
