import { describe, it, expect } from 'vitest';
import { convertAnthropicToolCall } from '../../../../src/llm/converters/anthropic-tool-call-converter.js';

describe('AnthropicToolConverter (integration)', () => {
  it('ignores non-tool-use start events', () => {
    const event = { type: 'content_block_start', index: 0, content_block: { type: 'text' } };
    expect(convertAnthropicToolCall(event)).toBeNull();
  });
});
