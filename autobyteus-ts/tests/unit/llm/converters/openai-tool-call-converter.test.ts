import { describe, it, expect } from 'vitest';
import { convertOpenAIToolCalls } from '../../../../src/llm/converters/openai-tool-call-converter.js';

describe('convertOpenAIToolCalls', () => {
  it('returns null when no tool calls are present', () => {
    expect(convertOpenAIToolCalls(undefined)).toBeNull();
    expect(convertOpenAIToolCalls([])).toBeNull();
  });

  it('maps tool call deltas to ToolCallDelta shape', () => {
    const result = convertOpenAIToolCalls([
      {
        index: 0,
        id: 'call_1',
        type: 'function',
        function: { name: 'write_file', arguments: '{"path":"/tmp/a.txt"}' }
      }
    ]);

    expect(result).toEqual([
      {
        index: 0,
        call_id: 'call_1',
        name: 'write_file',
        arguments_delta: '{"path":"/tmp/a.txt"}'
      }
    ]);
  });
});
