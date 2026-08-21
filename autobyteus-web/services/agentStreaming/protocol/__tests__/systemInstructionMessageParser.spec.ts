import { describe, expect, it } from 'vitest';
import { parseServerMessage } from '../messageParser';

describe('SYSTEM_INSTRUCTIONS_SUPPLIED parser', () => {
  it('preserves exact content and rejects noncanonical payloads', () => {
    expect(parseServerMessage(JSON.stringify({
      type: 'SYSTEM_INSTRUCTIONS_SUPPLIED',
      payload: { trace_id: 'raw-id', content: '  exact\ntext  ', ts: 12.5 },
    }))).toEqual({
      type: 'SYSTEM_INSTRUCTIONS_SUPPLIED',
      payload: { trace_id: 'raw-id', content: '  exact\ntext  ', ts: 12.5 },
    });

    expect(() => parseServerMessage(JSON.stringify({
      type: 'SYSTEM_INSTRUCTIONS_SUPPLIED',
      payload: { trace_id: 'raw-id', content: 'x', ts: 12.5, turn_id: 'forbidden' },
    }))).toThrow('Invalid canonical SYSTEM_INSTRUCTIONS_SUPPLIED payload');
    expect(() => parseServerMessage(JSON.stringify({
      type: 'SYSTEM_INSTRUCTIONS_SUPPLIED',
      payload: { trace_id: 'raw-id', content: 'x', ts: 0 },
    }))).toThrow('Invalid canonical SYSTEM_INSTRUCTIONS_SUPPLIED payload');
  });
});
