import { describe, it, expect } from 'vitest';
import { convertAnthropicToolCall } from '../../../../src/llm/converters/anthropic-tool-call-converter.js';

describe('AnthropicToolConverter', () => {
  it('should convert start event', () => {
    const event = {
      type: 'content_block_start',
      index: 1,
      content_block: { type: 'tool_use', id: 'call_1', name: 'tool' }
    };
    const res = convertAnthropicToolCall(event);
    expect(res).toHaveLength(1);
    expect(res![0].call_id).toBe('call_1');
    expect(res![0].index).toBe(1);
  });

  it('should convert delta event', () => {
    const event = {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '{' }
    };
    const res = convertAnthropicToolCall(event);
    expect(res![0].arguments_delta).toBe('{');
  });

  it('should return null for other events', () => {
    expect(convertAnthropicToolCall({ type: 'other' })).toBeNull();
  });
});
