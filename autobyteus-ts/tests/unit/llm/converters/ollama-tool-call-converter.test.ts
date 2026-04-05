import { describe, expect, it } from 'vitest';
import { convertOllamaToolCalls } from '../../../../src/llm/converters/ollama-tool-call-converter.js';

describe('convertOllamaToolCalls', () => {
  it('returns null when no tool calls are present', () => {
    expect(convertOllamaToolCalls(undefined)).toBeNull();
    expect(convertOllamaToolCalls(null)).toBeNull();
    expect(convertOllamaToolCalls([])).toBeNull();
  });

  it('serializes object arguments into a ToolCallDelta payload', () => {
    const result = convertOllamaToolCalls([
      {
        id: 'call_1',
        function: {
          index: 0,
          name: 'write_file',
          arguments: {
            file_path: 'hello.py',
            content: 'print(1)'
          }
        }
      }
    ]);

    expect(result).toEqual([
      {
        index: 0,
        call_id: 'call_1',
        name: 'write_file',
        arguments_delta: '{"file_path":"hello.py","content":"print(1)"}'
      }
    ]);
  });

  it('falls back to array order when Ollama omits a function index', () => {
    const result = convertOllamaToolCalls([
      {
        id: 'call_2',
        function: {
          name: 'search',
          arguments: '{"query":"autobyteus"}'
        }
      }
    ]);

    expect(result).toEqual([
      {
        index: 0,
        call_id: 'call_2',
        name: 'search',
        arguments_delta: '{"query":"autobyteus"}'
      }
    ]);
  });
});
