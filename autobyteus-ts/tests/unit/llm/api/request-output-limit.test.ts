import { describe, expect, it, vi } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { DeepSeekLLM } from '../../../../src/llm/api/deepseek-llm.js';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { GlmLLM } from '../../../../src/llm/api/glm-llm.js';
import { GrokLLM } from '../../../../src/llm/api/grok-llm.js';
import { KimiLLM } from '../../../../src/llm/api/kimi-llm.js';
import { MinimaxLLM } from '../../../../src/llm/api/minimax-llm.js';
import { MistralLLM } from '../../../../src/llm/api/mistral-llm.js';
import { OllamaLLM } from '../../../../src/llm/api/ollama-llm.js';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { OpenAILLM } from '../../../../src/llm/api/openai-llm.js';
import { QwenLLM } from '../../../../src/llm/api/qwen-llm.js';
import type { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { supportedModelDefinitions } from '../../../../src/llm/supported-model-definitions.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { resolveRequestMaxOutputTokens } from '../../../../src/llm/utils/max-output-tokens.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { geminiRuntimeResolver, providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const key = providerApiKeyResolver('synthetic-key');
const messages = [new Message(MessageRole.USER, { content: 'hello' })];

/** A catalog model exactly as the factory builds it from static metadata (no live refresh). */
const catalogModel = (provider: LLMProvider, value: string): LLMModel => {
  const definition = supportedModelDefinitions.find((entry) => entry.provider === provider && entry.value === value);
  if (!definition) throw new Error(`No catalog model ${provider}/${value}`);
  const { staticMetadata, ...runtimeDefinition } = definition;
  return new LLMModel({ ...runtimeDefinition, maxOutputTokens: staticMetadata.maxOutputTokens });
};

const syntheticModel = (provider: LLMProvider, maxOutputTokens: number | null, hostUrl?: string): LLMModel =>
  new LLMModel({ name: 'synthetic', value: 'synthetic', canonicalName: 'synthetic', provider, maxOutputTokens, hostUrl });

async function* emptyStream(): AsyncGenerator<never> {
  // Request-parameter tests only inspect the outgoing payload.
}

const drain = async (llm: BaseLLM): Promise<void> => {
  for await (const _chunk of llm.streamMessages(messages, { logicalConversationId: 'c' })) {
    // drain
  }
};

/** Installs a fake SDK client on an adapter and returns the request recorder. */
const withChatCompletionsClient = (llm: OpenAICompatibleLLM) => {
  const create = vi.fn(async (params: Record<string, unknown>) => params.stream
    ? emptyStream()
    : { choices: [{ finish_reason: 'stop', message: { content: 'ok' } }] });
  (llm as any).clientPromise = Promise.resolve({ chat: { completions: { create } } });
  return create;
};

const withResponsesClient = (llm: OpenAILLM) => {
  const create = vi.fn(async (params: Record<string, unknown>) => params.stream
    ? emptyStream()
    : { status: 'completed', output: [] });
  (llm as any).clientPromise = Promise.resolve({ responses: { create } });
  return create;
};

const withAnthropicClient = (llm: AnthropicLLM) => {
  const create = vi.fn(async (params: Record<string, unknown>) => params.stream
    ? emptyStream()
    : { stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } });
  (llm as any).clientPromise = Promise.resolve({ messages: { create } });
  return create;
};

const withGeminiClient = (llm: GeminiLLM) => {
  const generateContentStream = vi.fn(async () => emptyStream());
  const generateContent = vi.fn(async () => ({ text: 'ok', candidates: [{ finishReason: 'STOP' }] }));
  (llm as any).clientPromise = Promise.resolve({
    client: { models: { generateContent, generateContentStream } },
    runtimeInfo: { runtime: 'api_key' },
  });
  return { generateContent, generateContentStream };
};

const lastParams = (mock: ReturnType<typeof vi.fn>): Record<string, any> => mock.mock.calls.at(-1)![0];

describe('resolveRequestMaxOutputTokens', () => {
  it('prefers the configured value, then the model maximum, else null', () => {
    const model = syntheticModel(LLMProvider.OPENAI, 128_000);
    expect(resolveRequestMaxOutputTokens(model, new LLMConfig({ maxTokens: 4096 }))).toBe(4096);
    expect(resolveRequestMaxOutputTokens(model, new LLMConfig())).toBe(128_000);
    expect(resolveRequestMaxOutputTokens(syntheticModel(LLMProvider.OPENAI, null), new LLMConfig())).toBeNull();
  });

  it('never writes the resolved default into config.maxTokens (CON-001)', async () => {
    const config = new LLMConfig();
    const llm = new AnthropicLLM(catalogModel(LLMProvider.ANTHROPIC, 'claude-opus-5-5'), config, key);
    withAnthropicClient(llm);
    await drain(llm);
    expect(config.maxTokens).toBeNull();
    expect(llm.config.maxTokens).toBeNull();
  });
});

describe('Anthropic output limit (AC-001, AC-008)', () => {
  it('streams Opus 5.5 with the catalog maximum when unconfigured', async () => {
    const llm = new AnthropicLLM(catalogModel(LLMProvider.ANTHROPIC, 'claude-opus-5-5'), new LLMConfig(), key);
    const create = withAnthropicClient(llm);
    await drain(llm);
    expect(lastParams(create)).toMatchObject({ stream: true, max_tokens: 128_000 });
  });

  it('streams a configured max_tokens unchanged', async () => {
    const llm = new AnthropicLLM(catalogModel(LLMProvider.ANTHROPIC, 'claude-opus-5-5'), new LLMConfig({ maxTokens: 4096 }), key);
    const create = withAnthropicClient(llm);
    await drain(llm);
    expect(lastParams(create).max_tokens).toBe(4096);
  });

  it('refuses to stream a model with no known limit and no configured value', async () => {
    const llm = new AnthropicLLM(syntheticModel(LLMProvider.ANTHROPIC, null), new LLMConfig(), key);
    const create = withAnthropicClient(llm);
    await expect(drain(llm)).rejects.toThrow("has no known maximum output tokens; configure max_tokens");
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps the bounded 8192 default for non-streaming calls, which the SDK accepts', async () => {
    const llm = new AnthropicLLM(catalogModel(LLMProvider.ANTHROPIC, 'claude-opus-5-5'), new LLMConfig(), key);
    const create = withAnthropicClient(llm);
    await llm.sendMessages(messages);
    expect(lastParams(create).max_tokens).toBe(8192);
    expect(lastParams(create).stream).toBeUndefined();
  });

  it('sends a configured value on non-streaming calls', async () => {
    const llm = new AnthropicLLM(catalogModel(LLMProvider.ANTHROPIC, 'claude-opus-5-5'), new LLMConfig({ maxTokens: 4096 }), key);
    const create = withAnthropicClient(llm);
    await llm.sendMessages(messages);
    expect(lastParams(create).max_tokens).toBe(4096);
  });

  it('accepts the bounded non-streaming default in the real SDK guard', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: 'synthetic' });
    expect(() => (client as any).calculateNonstreamingTimeout(8192)).not.toThrow();
    expect(() => (client as any).calculateNonstreamingTimeout(128_000)).toThrow('Streaming is required');
  });
});

describe('OpenAI Responses output limit (AC-013)', () => {
  it.each([true, false])('sends the catalog maximum as max_output_tokens (stream=%s)', async (stream) => {
    const llm = new OpenAILLM(catalogModel(LLMProvider.OPENAI, 'gpt-5.5'), new LLMConfig(), key);
    const create = withResponsesClient(llm);
    if (stream) await drain(llm); else await llm.sendMessages(messages);
    expect(lastParams(create).max_output_tokens).toBe(128_000);
  });

  it('sends a configured value and omits the parameter for unknown-limit models', async () => {
    const configured = new OpenAILLM(catalogModel(LLMProvider.OPENAI, 'gpt-5.5'), new LLMConfig({ maxTokens: 777 }), key);
    const configuredCreate = withResponsesClient(configured);
    await drain(configured);
    expect(lastParams(configuredCreate).max_output_tokens).toBe(777);

    const unknown = new OpenAILLM(syntheticModel(LLMProvider.OPENAI, null), new LLMConfig(), key);
    const unknownCreate = withResponsesClient(unknown);
    await drain(unknown);
    expect(lastParams(unknownCreate)).not.toHaveProperty('max_output_tokens');
  });
});

describe('OpenAI-compatible output limit and parameter name (AC-013, RSK-004)', () => {
  const cases: Array<[string, () => OpenAICompatibleLLM, string, number]> = [
    ['DeepSeek (documents max_tokens only)', () => new DeepSeekLLM(catalogModel(LLMProvider.DEEPSEEK, 'deepseek-v4-pro'), new LLMConfig(), key), 'max_tokens', 384_000],
    ['GLM / Z.ai (documents max_tokens only)', () => new GlmLLM(catalogModel(LLMProvider.GLM, 'glm-5.3'), new LLMConfig(), key), 'max_tokens', 128_000],
    ['Qwen / Model Studio (max_completion_tokens)', () => new QwenLLM(catalogModel(LLMProvider.QWEN, 'qwen3.7-max'), new LLMConfig(), key), 'max_completion_tokens', 65_536],
    ['generic endpoint (max_completion_tokens)', () => new OpenAICompatibleLLM(syntheticModel(LLMProvider.OPENAI, 32_000), 'http://localhost:1', new LLMConfig(), key, LLMProvider.OPENAI), 'max_completion_tokens', 32_000],
  ];

  it.each(cases)('%s sends the catalog maximum', async (_label, build, parameter, expected) => {
    for (const stream of [true, false]) {
      const llm = build();
      const create = withChatCompletionsClient(llm);
      if (stream) await drain(llm); else await llm.sendMessages(messages);
      const params = lastParams(create);
      expect(params[parameter]).toBe(expected);
      const other = parameter === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
      expect(params).not.toHaveProperty(other);
    }
  });

  it.each([
    ['Grok', () => new GrokLLM(catalogModel(LLMProvider.GROK, 'grok-4.7'), new LLMConfig(), key)],
    ['Kimi', () => new KimiLLM(catalogModel(LLMProvider.KIMI, 'kimi-k3'), new LLMConfig(), key)],
    ['MiniMax', () => new MinimaxLLM(catalogModel(LLMProvider.MINIMAX, 'MiniMax-M3'), new LLMConfig(), key)],
  ])('%s has no catalog limit, so the provider default applies', async (_label, build) => {
    const llm = build();
    const create = withChatCompletionsClient(llm);
    await drain(llm);
    expect(lastParams(create)).not.toHaveProperty('max_completion_tokens');
    expect(lastParams(create)).not.toHaveProperty('max_tokens');
  });

  it('keeps a configured value through the Grok config copy path and the Kimi config rebuild', async () => {
    const grok = new GrokLLM(catalogModel(LLMProvider.GROK, 'grok-4.7'), new LLMConfig({ maxTokens: 2048 }), key);
    const grokCreate = withChatCompletionsClient(grok);
    await drain(grok);
    expect(lastParams(grokCreate).max_completion_tokens).toBe(2048);

    const kimi = new KimiLLM(catalogModel(LLMProvider.KIMI, 'kimi-k3'), new LLMConfig({ maxTokens: 1024 }), key);
    const kimiCreate = withChatCompletionsClient(kimi);
    await drain(kimi);
    expect(lastParams(kimiCreate).max_completion_tokens).toBe(1024);
  });

  it('sends a configured DeepSeek value under max_tokens', async () => {
    const llm = new DeepSeekLLM(catalogModel(LLMProvider.DEEPSEEK, 'deepseek-v4-pro'), new LLMConfig({ maxTokens: 4096 }), key);
    const create = withChatCompletionsClient(llm);
    await drain(llm);
    expect(lastParams(create).max_tokens).toBe(4096);
  });
});

describe('Gemini output limit (AC-013)', () => {
  it.each(['gemini-3.1-pro-preview', 'gemini-3.8-flash'])('%s sends the catalog maximum as maxOutputTokens', async (value) => {
    const llm = new GeminiLLM(catalogModel(LLMProvider.GEMINI, value), new LLMConfig(), key, geminiRuntimeResolver());
    const { generateContent, generateContentStream } = withGeminiClient(llm);
    await drain(llm);
    await llm.sendMessages(messages);
    expect(lastParams(generateContentStream).config.maxOutputTokens).toBe(65_536);
    expect(lastParams(generateContent).config.maxOutputTokens).toBe(65_536);
  });

  it('omits maxOutputTokens for an unknown-limit model', async () => {
    const llm = new GeminiLLM(syntheticModel(LLMProvider.GEMINI, null), new LLMConfig(), key, geminiRuntimeResolver());
    const { generateContentStream } = withGeminiClient(llm);
    await drain(llm);
    expect(lastParams(generateContentStream).config.maxOutputTokens).toBeUndefined();
  });
});

describe('Mistral output limit (AC-013)', () => {
  it('sends the resolved limit as maxTokens and omits it when unknown', async () => {
    const known = new MistralLLM(syntheticModel(LLMProvider.MISTRAL, 32_000), new LLMConfig(), key);
    const stream = vi.fn(async () => emptyStream());
    const complete = vi.fn(async () => ({ choices: [{ finishReason: 'stop', message: { content: 'ok' } }] }));
    (known as any).clientPromise = Promise.resolve({ chat: { stream, complete } });
    await drain(known);
    await known.sendMessages(messages);
    expect(lastParams(stream).maxTokens).toBe(32_000);
    expect(lastParams(complete).maxTokens).toBe(32_000);

    const catalog = new MistralLLM(catalogModel(LLMProvider.MISTRAL, 'mistral-large-2512'), new LLMConfig(), key);
    (catalog as any).clientPromise = Promise.resolve({ chat: { stream, complete } });
    await drain(catalog);
    expect(lastParams(stream).maxTokens).toBeUndefined();
  });
});

describe('Ollama output limit (AC-013)', () => {
  it('sends the resolved limit as options.num_predict and omits it when unknown', async () => {
    const known = new OllamaLLM(syntheticModel(LLMProvider.OLLAMA, 16_384, 'http://localhost:11434'), new LLMConfig(), key);
    const chat = vi.fn(async (request: Record<string, unknown>) => request.stream
      ? emptyStream()
      : { done: true, done_reason: 'stop', message: { content: 'ok' } });
    (known as any).client = { chat, abort: vi.fn() };
    await drain(known);
    expect(lastParams(chat).options.num_predict).toBe(16_384);

    const unknown = new OllamaLLM(syntheticModel(LLMProvider.OLLAMA, null, 'http://localhost:11434'), new LLMConfig(), key);
    (unknown as any).client = { chat, abort: vi.fn() };
    await unknown.sendMessages(messages);
    expect(lastParams(chat).options).toBeUndefined();
  });
});
