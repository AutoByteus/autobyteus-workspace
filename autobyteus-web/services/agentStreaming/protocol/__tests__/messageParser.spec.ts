import { describe, expect, it } from 'vitest';
import { parseServerMessage } from '../messageParser';

describe('messageParser', () => {
  it('parses valid SEGMENT_START message', () => {
    const raw = JSON.stringify({
      type: 'SEGMENT_START',
      payload: {
        id: 'seg-1',
        segment_type: 'tool_call',
      },
    });

    const parsed = parseServerMessage(raw);
    expect(parsed.type).toBe('SEGMENT_START');
  });

  it('throws when SEGMENT_START id is missing', () => {
    const raw = JSON.stringify({
      type: 'SEGMENT_START',
      payload: {
        segment_type: 'tool_call',
      },
    });

    expect(() => parseServerMessage(raw)).toThrow('SEGMENT_START payload missing non-empty "id"');
  });

  it('throws when SEGMENT_START only provides segment_id', () => {
    const raw = JSON.stringify({
      type: 'SEGMENT_START',
      payload: {
        segment_id: 'seg-legacy',
        segment_type: 'tool_call',
      },
    });

    expect(() => parseServerMessage(raw)).toThrow('SEGMENT_START payload missing non-empty "id"');
  });

  it('throws when SEGMENT_CONTENT delta is missing', () => {
    const raw = JSON.stringify({
      type: 'SEGMENT_CONTENT',
      payload: {
        id: 'seg-2',
      },
    });

    expect(() => parseServerMessage(raw)).toThrow('SEGMENT_CONTENT payload missing "delta"');
  });
});
