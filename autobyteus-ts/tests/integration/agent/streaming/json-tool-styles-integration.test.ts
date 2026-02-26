import { describe, it, expect } from 'vitest';
import { ParsingStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/parsing-streaming-response-handler.js';
import { ParserConfig } from '../../../../src/agent/streaming/parser/parser-context.js';
import { getJsonToolParsingProfile } from '../../../../src/agent/streaming/parser/json-parsing-strategies/index.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const chunkText = (text: string, chunkSize = 7): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

describe('JSON tool styles (integration)', () => {
  const cases: Array<{
    provider: LLMProvider;
    rawJson: string;
    expected: { name: string; args: Record<string, any> };
  }> = [
    {
      provider: LLMProvider.OPENAI,
      rawJson:
        '{"tool_calls": [{"function": {"name": "weather", "arguments": "{\\"city\\": \\\"NYC\\\"}"}}]}',
      expected: { name: 'weather', args: { city: 'NYC' } }
    },
    {
      provider: LLMProvider.GEMINI,
      rawJson: '{"name": "search", "args": {"query": "autobyteus"}}',
      expected: { name: 'search', args: { query: 'autobyteus' } }
    },
    {
      provider: LLMProvider.KIMI,
      rawJson: '{"tool": {"function": "write_file", "parameters": {"path": "a.txt"}}}',
      expected: { name: 'write_file', args: { path: 'a.txt' } }
    }
  ];

  for (const { provider, rawJson, expected } of cases) {
    it(`parses JSON tool style for ${provider}`, () => {
      const profile = getJsonToolParsingProfile(provider);
      const config = new ParserConfig({
        parseToolCalls: true,
        jsonToolPatterns: profile.signaturePatterns,
        jsonToolParser: profile.parser,
        strategyOrder: ['json_tool']
      });
      const handler = new ParsingStreamingResponseHandler({ config, parserName: 'json' });

      for (const chunk of chunkText(rawJson, 5)) {
        handler.feed(new ChunkResponse({ content: chunk }));
      }

      handler.finalize();

      const invocations = handler.getAllInvocations();
      expect(invocations).toHaveLength(1);
      expect(invocations[0].name).toBe(expected.name);
      expect(invocations[0].arguments).toEqual(expected.args);
    });
  }
});
