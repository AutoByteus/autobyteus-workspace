import { describe, it, expect } from 'vitest';
import {
  OpenAiJsonToolParsingStrategy,
  GeminiJsonToolParsingStrategy,
  DefaultJsonToolParsingStrategy,
  getJsonToolParsingProfile
} from '../../../../../src/agent/streaming/parser/json-parsing-strategies/index.js';
import { LLMProvider } from '../../../../../src/llm/providers.js';

describe('JSON tool parsing strategies', () => {
  it('openai parser handles tool wrapper', () => {
    const parser = new OpenAiJsonToolParsingStrategy();
    const raw = '{"tool": {"function": {"name": "weather", "arguments": {"city": "NYC"}}}}';
    const parsed = parser.parse(raw);
    expect(parsed).toEqual([{ name: 'weather', arguments: { city: 'NYC' } }]);
  });

  it('openai parser handles tool_calls wrapper', () => {
    const parser = new OpenAiJsonToolParsingStrategy();
    const raw = '{"tool_calls": [{"function": {"name": "weather", "arguments": "{\\"city\\": \\"NYC\\"}"}}]}';
    const parsed = parser.parse(raw);
    expect(parsed).toEqual([{ name: 'weather', arguments: { city: 'NYC' } }]);
  });

  it('gemini parser handles args', () => {
    const parser = new GeminiJsonToolParsingStrategy();
    const raw = '{"name": "search", "args": {"query": "autobyteus"}}';
    const parsed = parser.parse(raw);
    expect(parsed).toEqual([{ name: 'search', arguments: { query: 'autobyteus' } }]);
  });

  it('default parser handles parameters', () => {
    const parser = new DefaultJsonToolParsingStrategy();
    const raw = '{"tool": {"function": "write_file", "parameters": {"path": "a.txt"}}}';
    const parsed = parser.parse(raw);
    expect(parsed).toEqual([{ name: 'write_file', arguments: { path: 'a.txt' } }]);
  });
});

describe('JSON parsing profiles', () => {
  it('selects gemini profile', () => {
    const profile = getJsonToolParsingProfile(LLMProvider.GEMINI);
    expect(profile.parser).toBeInstanceOf(GeminiJsonToolParsingStrategy);
  });

  it('selects openai profile', () => {
    const profile = getJsonToolParsingProfile(LLMProvider.OPENAI);
    expect(profile.parser).toBeInstanceOf(OpenAiJsonToolParsingStrategy);
  });

  it('defaults to default profile', () => {
    const profile = getJsonToolParsingProfile(LLMProvider.KIMI);
    expect(profile.parser).toBeInstanceOf(DefaultJsonToolParsingStrategy);
  });
});
