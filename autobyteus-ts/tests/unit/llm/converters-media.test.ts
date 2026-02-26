import { describe, it, expect, vi } from 'vitest';
import { isBase64, getMimeType } from '../../../src/llm/utils/media-payload-formatter.js';
import { convertOpenAIToolCalls } from '../../../src/llm/converters/openai-tool-call-converter.js';

describe('MediaPayloadFormatter', () => {
  it('should identify base64 strings', () => {
    expect(isBase64('dGVzdA==')).toBe(true);
    expect(isBase64('notbase64')).toBe(false);
  });

  it('should guess mime type', () => {
    expect(getMimeType('image.png')).toBe('image/png');
  });
});

describe('OpenAIToolConverter', () => {
  it('should convert valid deltas', () => {
    const input = [{
      index: 0,
      id: 'call_123',
      function: { name: 'test_tool', arguments: '' }
    }];
    const res = convertOpenAIToolCalls(input);
    expect(res).toHaveLength(1);
    expect(res![0].call_id).toBe('call_123');
    expect(res![0].name).toBe('test_tool');
  });

  it('should handle null input', () => {
    expect(convertOpenAIToolCalls(undefined)).toBeNull();
  });
});
