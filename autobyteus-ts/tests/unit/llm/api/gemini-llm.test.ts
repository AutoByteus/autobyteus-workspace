import { describe, expect, it } from 'vitest';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import {
  geminiProviderApiKeyResolver,
  geminiRuntimeResolver,
} from '../../provider-api-key-resolver-test-helpers.js';

const geminiModel = (value: string) => new LLMModel({
  name: value,
  value,
  canonicalName: value,
  provider: LLMProvider.GEMINI,
});

const response = (parts: Array<Record<string, unknown>> = [{ text: 'ok' }]) => ({
  text: 'ok',
  candidates: [{ content: { parts } }],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
});

const userMessages = [new Message(MessageRole.USER, 'Hello')];

const createLlm = (
  modelValue: string,
  config: LLMConfig,
) => new GeminiLLM(
  geminiModel(modelValue),
  config,
  geminiProviderApiKeyResolver({ aiStudio: 'synthetic-key' }),
  geminiRuntimeResolver(),
);

const captureGenerateContent = (
  llm: GeminiLLM,
  runtime: 'api_key' | 'vertex' = 'api_key',
  parts?: Array<Record<string, unknown>>,
) => {
  let captured: any;
  (llm as any).clientPromise = Promise.resolve({
    client: { models: {
      generateContent: async (params: any) => {
        captured = params;
        return response(parts);
      },
    } },
    runtimeInfo: { runtime, project: null, location: null },
  });
  return () => captured;
};

describe('GeminiLLM Gemini 3.8 request configuration', () => {
  it.each([
    ['api_key', 'AI Studio'],
    ['vertex', 'Vertex Express'],
    ['vertex', 'Vertex Project'],
  ] as const)('uses exact 3.8 identity and default medium thinking through %s (%s)', async (runtime) => {
    const llm = createLlm('gemini-3.8-flash', new LLMConfig());
    const captured = captureGenerateContent(llm, runtime);

    await llm.sendMessages(userMessages);

    expect(captured()).toMatchObject({
      model: 'gemini-3.8-flash',
      config: {
        responseMimeType: 'text/plain',
        systemInstruction: 'You are a helpful assistant.',
        thinkingConfig: { thinkingLevel: 'medium', includeThoughts: false },
      },
    });
    expect(captured().config).not.toHaveProperty('thinkingBudget');
    expect(captured().config.thinkingConfig).not.toHaveProperty('thinkingBudget');
  });

  it.each([
    ['low', 'low'],
    ['medium', 'medium'],
    ['high', 'high'],
    ['minimal', 'medium'],
  ] as const)('emits supported lower-case thinking level %s as %s', async (configured, expected) => {
    const llm = createLlm('gemini-3.8-flash', new LLMConfig({
      extraParams: { thinking_level: configured },
    }));
    const captured = captureGenerateContent(llm);

    await llm.sendMessages(userMessages);

    expect(captured().config.thinkingConfig.thinkingLevel).toBe(expected);
  });

  it('omits forbidden common and extra fields while retaining adapter-owned fields', async () => {
    const callerAbortController = new AbortController();
    const injectedAbortController = new AbortController();
    const llm = createLlm('gemini-3.8-flash', new LLMConfig({
      systemMessage: 'Gemini 3.8 system prompt',
      temperature: 0.9,
      topP: 0.8,
      maxTokens: 321,
      stopSequences: ['STOP'],
      frequencyPenalty: 0.4,
      presencePenalty: 0.3,
      extraParams: {
        thinking_level: 'high',
        thinkingLevel: 'low',
        include_thoughts: true,
        includeThoughts: false,
        thinkingConfig: { thinkingBudget: 999, thinkingLevel: 'low' },
        thinking_config: { thinking_budget: 999 },
        thinkingBudget: 999,
        thinking_budget: 999,
        temperature: 1,
        topP: 1,
        top_p: 1,
        topK: 64,
        top_k: 64,
        candidateCount: 2,
        candidate_count: 2,
        frequencyPenalty: 1,
        frequency_penalty: 1,
        presencePenalty: 1,
        presence_penalty: 1,
        tools: [{ callerOwned: true }],
        abortSignal: injectedAbortController.signal,
        abort_signal: injectedAbortController.signal,
        seed: 42,
      },
    }));
    const captured = captureGenerateContent(llm);
    const tools = [{ name: 'lookup', description: 'Look up a value', parameters: { type: 'object' } }];

    await llm.sendMessages(userMessages, null, { tools }, { signal: callerAbortController.signal });

    expect(captured().config).toEqual({
      responseMimeType: 'text/plain',
      systemInstruction: 'Gemini 3.8 system prompt',
      seed: 42,
      thinkingConfig: { thinkingLevel: 'high', includeThoughts: true },
      maxOutputTokens: 321,
      stopSequences: ['STOP'],
      tools: [{ functionDeclarations: tools }],
      abortSignal: callerAbortController.signal,
    });
  });

  it('surfaces provider thought summaries only when the provider returns them', async () => {
    const enabledLlm = createLlm('gemini-3.8-flash', new LLMConfig({
      extraParams: { include_thoughts: true },
    }));
    captureGenerateContent(enabledLlm, 'api_key', [
      { text: 'summary', thought: true },
      { text: 'answer' },
    ]);
    const enabled = await enabledLlm.sendMessages(userMessages);

    const disabledLlm = createLlm('gemini-3.8-flash', new LLMConfig());
    captureGenerateContent(disabledLlm, 'api_key', [{ text: 'answer' }]);
    const disabled = await disabledLlm.sendMessages(userMessages);

    expect(enabled).toMatchObject({ content: 'answer', reasoning: 'summary' });
    expect(disabled).toMatchObject({ content: 'answer', reasoning: null });
  });

  it('uses the same 3.8 policy for streaming requests', async () => {
    let captured: any;
    const llm = createLlm('gemini-3.8-flash', new LLMConfig({
      extraParams: { thinking_level: 'low', topK: 64 },
    }));
    (llm as any).clientPromise = Promise.resolve({
      client: { models: {
        generateContentStream: async (params: any) => {
          captured = params;
          return (async function* () {
            yield response();
          })();
        },
      } },
      runtimeInfo: { runtime: 'vertex', project: 'project', location: 'global' },
    });

    for await (const _chunk of llm.streamMessages(userMessages)) {
      // Exhaust the stream to exercise request construction.
    }

    expect(captured.model).toBe('gemini-3.8-flash');
    expect(captured.config.thinkingConfig).toEqual({ thinkingLevel: 'low', includeThoughts: false });
    expect(captured.config).not.toHaveProperty('topK');
  });

  it('preserves the Gemini 3.1 Pro budget and sampling request shape', async () => {
    const llm = createLlm('gemini-3.1-pro-preview', new LLMConfig({
      temperature: 0.6,
      topP: 0.7,
      maxTokens: 512,
      stopSequences: ['DONE'],
      frequencyPenalty: 0.2,
      presencePenalty: 0.1,
      extraParams: { thinking_level: 'high', include_thoughts: true, topK: 32 },
    }));
    const captured = captureGenerateContent(llm);

    await llm.sendMessages(userMessages);

    expect(captured().config).toEqual({
      responseMimeType: 'text/plain',
      systemInstruction: 'You are a helpful assistant.',
      temperature: 0.6,
      topP: 0.7,
      maxOutputTokens: 512,
      stopSequences: ['DONE'],
      presencePenalty: 0.1,
      frequencyPenalty: 0.2,
      thinkingConfig: { thinkingBudget: 16384, includeThoughts: true },
      topK: 32,
    });
  });
});
