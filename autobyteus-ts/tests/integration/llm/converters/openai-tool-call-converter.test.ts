import { describe, it, expect } from 'vitest';
import { convertOpenAIToolCalls } from '../../../../src/llm/converters/openai-tool-call-converter.js';

describe('OpenAIToolConverter (integration)', () => {
  it('returns null for empty input', () => {
    expect(convertOpenAIToolCalls(undefined)).toBeNull();
    expect(convertOpenAIToolCalls([])).toBeNull();
  });
});
