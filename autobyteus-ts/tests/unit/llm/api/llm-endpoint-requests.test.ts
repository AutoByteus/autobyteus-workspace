import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { DeepSeekLLM } from '../../../../src/llm/api/deepseek-llm.js';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { GlmLLM } from '../../../../src/llm/api/glm-llm.js';
import { GrokLLM } from '../../../../src/llm/api/grok-llm.js';
import { MistralLLM } from '../../../../src/llm/api/mistral-llm.js';
import { OpenAILLM } from '../../../../src/llm/api/openai-llm.js';
import { providerAddressThrough } from '../../../../src/llm/llm-endpoint.js';
import { LLMFactory } from '../../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import type { BaseLLM } from '../../../../src/llm/base.js';
import { geminiRuntimeResolver, providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

/**
 * FU-003 (autobyteus-581): a client given an endpoint sends its calls there, under the provider's own path, with the
 * resolver's value in the provider's own credential header (on a relayed node, the run's pass). Only `fetch` is doubled.
 */
const RELAY = 'http://127.0.0.1:45999/relay/fixture';
const endpoint = { baseUrl: RELAY };
const key = providerApiKeyResolver();
const config = () => new LLMConfig({ maxTokens: 50 });
const model = (provider: LLMProvider, value = 'fixture') => new LLMModel({ name: value, value, provider });
const messages = [new Message(MessageRole.USER, { content: 'Synthetic fixture only.' })];

type Seen = { url: string; headers: Headers };
const capture = (): Seen[] => {
  const seen: Seen[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    seen.push({ url: request.url, headers: new Headers(init?.headers ?? request.headers) });
    return new Response(JSON.stringify({ error: { message: 'synthetic' } }), { status: 400, headers: { 'content-type': 'application/json' } });
  }));
  return seen;
};
afterEach(() => { vi.unstubAllGlobals(); });

describe('providerAddressThrough', () => {
  it('replaces only the origin and keeps the provider path', () => {
    expect(providerAddressThrough('https://api.openai.com/v1', endpoint)).toBe(`${RELAY}/v1`);
    expect(providerAddressThrough('https://open.bigmodel.cn/api/coding/paas/v4/', endpoint)).toBe(`${RELAY}/api/coding/paas/v4/`);
    expect(providerAddressThrough('https://api.anthropic.com', { baseUrl: `${RELAY}/` })).toBe(RELAY);
    expect(providerAddressThrough('https://api.x.ai/v1', undefined)).toBe('https://api.x.ai/v1');
  });
});

describe('a client with an endpoint', () => {
  const cases: Array<{ name: string; llm: () => BaseLLM; path: string; header: (h: Headers) => string | null }> = [
    { name: 'OpenAI (Responses)', llm: () => new OpenAILLM(model(LLMProvider.OPENAI), config(), key, endpoint),
      path: '/relay/fixture/v1/responses', header: (h) => h.get('authorization') },
    { name: 'Anthropic', llm: () => new AnthropicLLM(model(LLMProvider.ANTHROPIC, 'claude-opus-5'), config(), key, endpoint),
      path: '/relay/fixture/v1/messages', header: (h) => h.get('x-api-key') },
    { name: 'DeepSeek', llm: () => new DeepSeekLLM(model(LLMProvider.DEEPSEEK), config(), key, endpoint),
      path: '/relay/fixture/chat/completions', header: (h) => h.get('authorization') },
    { name: 'Grok', llm: () => new GrokLLM(model(LLMProvider.GROK), config(), key, endpoint),
      path: '/relay/fixture/v1/chat/completions', header: (h) => h.get('authorization') },
    { name: 'GLM', llm: () => new GlmLLM(model(LLMProvider.GLM), config(), key, endpoint),
      path: '/relay/fixture/api/coding/paas/v4/chat/completions', header: (h) => h.get('authorization') },
    { name: 'Mistral', llm: () => new MistralLLM(model(LLMProvider.MISTRAL), config(), key, endpoint),
      path: '/relay/fixture/v1/chat/completions', header: (h) => h.get('authorization') },
    { name: 'Gemini (AI Studio)', llm: () => new GeminiLLM(model(LLMProvider.GEMINI), config(), key, geminiRuntimeResolver(), endpoint),
      path: '/relay/fixture/v1beta/models/fixture:generateContent', header: (h) => h.get('x-goog-api-key') },
  ];

  it.each(cases)('$name calls the endpoint under its own path with the resolver value', async ({ llm, path, header }) => {
    const seen = capture();
    await expect(llm().sendMessages(messages, {}, { retryMode: 'single_attempt' })).rejects.toThrow();
    expect(seen).toHaveLength(1);
    const url = new URL(seen[0]!.url);
    expect(url.origin).toBe('http://127.0.0.1:45999');
    expect(url.pathname).toBe(path);
    expect(header(seen[0]!.headers)).toMatch(/synthetic-test-key$/);
  });

  it('Gemini refuses an endpoint on Vertex (the relay serves AI Studio only)', async () => {
    capture();
    const llm = new GeminiLLM(model(LLMProvider.GEMINI), config(), key, geminiRuntimeResolver({ kind: 'vertexExpress' }), endpoint);
    await expect(llm.sendMessages(messages)).rejects.toThrow('GEMINI_ENDPOINT_NEEDS_AI_STUDIO');
  });

  it('the factory refuses an endpoint for a provider without one (local models)', async () => {
    await LLMFactory.ensureInitialized();
    const local = new LLMModel({ name: 'local', value: 'local', provider: LLMProvider.OLLAMA, hostUrl: 'http://127.0.0.1:1', llmClass: GrokLLM });
    LLMFactory.registerModel(local);
    await expect(LLMFactory.createLLM(local.modelIdentifier, undefined, key, undefined, endpoint)).rejects.toThrow('LLM_ENDPOINT_NOT_SUPPORTED: OLLAMA');
  });
});
