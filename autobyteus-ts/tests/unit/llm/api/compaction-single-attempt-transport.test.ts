import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { OpenAIResponsesLLM } from '../../../../src/llm/api/openai-responses-llm.js';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { MistralLLM } from '../../../../src/llm/api/mistral-llm.js';
import { OllamaLLM } from '../../../../src/llm/api/ollama-llm.js';
import { AutobyteusLLM } from '../../../../src/llm/api/autobyteus-llm.js';
import { DeepSeekLLM } from '../../../../src/llm/api/deepseek-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { providerApiKeyResolver, geminiRuntimeResolver } from '../../provider-api-key-resolver-test-helpers.js';
import type { BaseLLM } from '../../../../src/llm/base.js';
import axios, { AxiosError } from 'axios';

// Only the local transport is substituted; production adapters and installed SDK calls/retries run.
vi.mock('../../../../src/llm/transport/local-long-running-fetch.js', () => ({
  createLocalLongRunningFetch: () => globalThis.fetch,
  LOCAL_PROVIDER_SDK_TIMEOUT_MS: 86_400_000,
}));
const key = providerApiKeyResolver();
const model = (provider: LLMProvider) => new LLMModel({ name: 'fixture', value: 'fixture', provider, hostUrl: 'http://synthetic.invalid' });
const config = () => new LLMConfig({ maxTokens: 100 });
const messages = [new Message(MessageRole.USER, { content: 'Synthetic fixture only.' })];
const factories: Record<string, () => BaseLLM> = {
  openai: () => new OpenAICompatibleLLM(model(LLMProvider.OPENAI), 'https://synthetic.invalid', config(), key, 'OPENAI'),
  responses: () => new OpenAIResponsesLLM(model(LLMProvider.OPENAI), 'https://synthetic.invalid', config(), key, 'OPENAI'),
  deepseek: () => new DeepSeekLLM(model(LLMProvider.DEEPSEEK), config(), key),
  anthropic: () => new AnthropicLLM(model(LLMProvider.ANTHROPIC), config(), key),
  geminiAiStudio: () => new GeminiLLM(model(LLMProvider.GEMINI), config(), key, geminiRuntimeResolver()),
  geminiExpress: () => new GeminiLLM(model(LLMProvider.GEMINI), config(), key, geminiRuntimeResolver({ kind: 'vertexExpress' })),
  geminiProject: () => new GeminiLLM(model(LLMProvider.GEMINI), config(), key, geminiRuntimeResolver({ kind: 'vertexProject', project: 'synthetic-project', location: 'global' })),
  mistral: () => new MistralLLM(model(LLMProvider.MISTRAL), config(), key),
  ollama: () => new OllamaLLM(model(LLMProvider.OLLAMA), config(), key),
};
const require = createRequire(import.meta.url);
const googleRequire = createRequire(require.resolve('@google/genai'));
const { GoogleAuth } = googleRequire('google-auth-library');
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('compaction invocation-local SDK retry bound', () => {
  it.each(Object.keys(factories).flatMap(family => [401, 429, 503].map(status => ({ family, status }))))('$family status $status makes one SDK fetch', async ({ family, status }) => {
    vi.spyOn(GoogleAuth.prototype, 'getRequestHeaders').mockResolvedValue(new Headers({ authorization: 'Bearer synthetic' }));
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'synthetic failure', code: status } }), { status, headers: { 'content-type': 'application/json', 'retry-after': '0.001' } }));
    vi.stubGlobal('fetch', fetch);
    const llm = factories[family]!();
    await expect(llm.sendMessages(messages, {}, { retryMode: 'single_attempt' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('preserves parent OpenAI SDK retry defaults on the same adapter', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 503, headers: { 'retry-after': '0.001' } }));
    vi.stubGlobal('fetch', fetch); const llm = factories.openai!();
    await expect(llm.sendMessages(messages, {}, { retryMode: 'single_attempt' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(llm.sendMessages(messages)).rejects.toThrow(); expect(fetch).toHaveBeenCalledTimes(4);
  });
  it.each(['openai', 'responses', 'deepseek', 'anthropic', 'mistral', 'geminiAiStudio', 'ollama'])('%s transport timeout does not amplify one invocation', async family => {
    const fetch = vi.fn(async () => { throw new DOMException('Synthetic timeout', 'TimeoutError'); });
    vi.stubGlobal('fetch', fetch);
    await expect(factories[family]!().sendMessages(messages, {}, { retryMode: 'single_attempt' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('sets Gemini retries on its isolated client after user extras, leaving the parent client unchanged', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 503 })); vi.stubGlobal('fetch', fetch);
    const llm = new GeminiLLM(model(LLMProvider.GEMINI), new LLMConfig({ extraParams: { httpOptions: { retryOptions: { attempts: 7 } } } }), key, geminiRuntimeResolver());
    await expect(llm.sendMessages(messages, {}, { retryMode: 'single_attempt' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledOnce();
    // The normal cached client was not constructed or overwritten by the isolated invocation.
    expect((llm as any).clientPromise).toBeNull();
  });
  it('counts one remote generation request through the real axios client (not remote host internal work)', async () => {
    const create = axios.create.bind(axios); const requests: string[] = [];
    vi.spyOn(axios, 'create').mockImplementation(options => create({ ...options, adapter: async config => {
      requests.push(config.url!); throw new AxiosError('Synthetic 503', 'ERR_BAD_RESPONSE', config, null,
        { status: 503, statusText: 'Unavailable', data: {}, headers: {}, config });
    } }));
    const llm = new AutobyteusLLM(model(LLMProvider.AUTOBYTEUS), config(), key);
    await expect(llm.sendMessages(messages, { logicalConversationId: 'synthetic-op' }, { retryMode: 'single_attempt' })).rejects.toThrow();
    expect(requests).toHaveLength(1); expect(requests[0]).toMatch(/\/send-message$/);
  });
});
