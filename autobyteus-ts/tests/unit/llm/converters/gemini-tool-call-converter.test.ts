import { describe, expect, it } from 'vitest';
import {
  convertGeminiToolCallParts,
  convertGeminiToolCalls,
} from '../../../../src/llm/converters/gemini-tool-call-converter.js';

describe('convertGeminiToolCalls', () => {
  it('returns null when the part has no function call', () => {
    expect(convertGeminiToolCalls({ text: 'hello' })).toBeNull();
  });

  it('uses the supplied index for Gemini function-call parts', () => {
    const result = convertGeminiToolCalls({
      functionCall: { id: 'call_b', name: 'get_time', args: { city: 'Berlin' } }
    }, 1);

    expect(result).toEqual([{
      index: 1,
      call_id: 'call_b',
      name: 'get_time',
      arguments_delta: JSON.stringify({ city: 'Berlin' }),
      native_context: {
        provider: 'gemini',
        functionCallPart: {
          functionCall: { id: 'call_b', name: 'get_time', args: { city: 'Berlin' } }
        }
      }
    }]);
  });

  it('converts multiple Gemini function-call parts with distinct ordered indexes', () => {
    const result = convertGeminiToolCallParts([
      { functionCall: { id: 'call_a', name: 'get_weather', args: { city: 'Berlin' } } },
      { text: 'ignored' },
      { functionCall: { id: 'call_b', name: 'get_time', args: { city: 'Berlin' } } }
    ]);

    expect(result?.map((delta) => delta.index)).toEqual([0, 1]);
    expect(result?.map((delta) => delta.call_id)).toEqual(['call_a', 'call_b']);
  });
});
