import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GrokLLM,
  normalizeGrokInvocationKwargs,
  normalizeGrokRequestConfig,
} from '../../../../src/llm/api/grok-llm.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'lookup_weather',
      description: 'Look up weather',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
];

const buildModel = () => new LLMModel({
  name: 'grok-4.6',
  value: 'grok-4.6',
  canonicalName: 'grok-4.6',
  provider: LLMProvider.GROK,
});

describe('GrokLLM request policy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('normalizes config and invocation kwargs without mutating any source state', async () => {
    const config = new LLMConfig({
      temperature: 0,
      frequencyPenalty: 0.2,
      presencePenalty: 0.3,
      stopSequences: ['END'],
      extraParams: {
        stop: ['STOP'],
        stop_sequences: ['STOP'],
        stopSequences: ['STOP'],
        presence_penalty: 0.4,
        presencePenalty: 0.5,
        frequency_penalty: 0.6,
        frequencyPenalty: 0.7,
        reasoningEffort: 'none',
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
      },
    });
    const kwargs = {
      stop: ['STOP'],
      stop_sequences: ['STOP'],
      stopSequences: ['STOP'],
      presence_penalty: 0.4,
      presencePenalty: 0.5,
      frequency_penalty: 0.6,
      frequencyPenalty: 0.7,
      reasoningEffort: 'none',
      reasoning_effort: 'low',
      tools,
      tool_choice: 'required',
      metadata: { request: 'kept' },
    };
    const configSnapshot = structuredClone(config.toDict());
    const kwargsSnapshot = structuredClone(kwargs);
    const syncPayloads: Record<string, unknown>[] = [];
    const streamPayloads: Record<string, unknown>[] = [];

    const llm = new GrokLLM(buildModel(), config, providerApiKeyResolver('synthetic-grok-key'));
    const create = vi
      .fn()
      .mockImplementationOnce(async (payload: Record<string, unknown>) => {
        syncPayloads.push(payload);
        return { choices: [{ message: { content: 'ok' } }] };
      })
      .mockImplementationOnce(async (payload: Record<string, unknown>) => {
        streamPayloads.push(payload);
        return (async function* () {
          yield { choices: [{ delta: { content: 'streamed' } }] };
        })();
      });
    (llm as any).clientPromise = Promise.resolve({ chat: { completions: { create } } });

    await llm.sendUserMessage(new LLMUserMessage({ content: 'Hello' }), kwargs);
    for await (const _chunk of llm.streamUserMessage(
      new LLMUserMessage({ content: 'Hello again' }),
      kwargs,
    )) {
      // Consume the stream so the request path is exercised.
    }

    for (const payload of [...syncPayloads, ...streamPayloads]) {
      expect(payload).toMatchObject({
        model: 'grok-4.6',
        temperature: 0,
        reasoning_effort: 'low',
        tools,
        tool_choice: 'required',
        response_format: { type: 'json_object' },
      });
      expect(payload).not.toHaveProperty('frequency_penalty');
      expect(payload).not.toHaveProperty('presence_penalty');
      expect(payload).not.toHaveProperty('stop');
    }
    expect(syncPayloads[0]).not.toHaveProperty('reasoningEffort');
    expect(streamPayloads[0]).toMatchObject({ stream: true });
    expect(config.toDict()).toEqual(configSnapshot);
    expect(config.stopSequences).toEqual(['END']);
    expect(config.extraParams).toEqual({
      stop: ['STOP'],
      stop_sequences: ['STOP'],
      stopSequences: ['STOP'],
      presence_penalty: 0.4,
      presencePenalty: 0.5,
      frequency_penalty: 0.6,
      frequencyPenalty: 0.7,
      reasoningEffort: 'none',
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
    });
    expect(kwargs).toEqual(kwargsSnapshot);
    await llm.cleanup();
  });

  it('uses high reasoning by default and removes invalid canonical and non-canonical values', () => {
    const sourceConfig = new LLMConfig({
      extraParams: { reasoning_effort: 'none', reasoningEffort: 'high' },
    });
    const normalizedConfig = normalizeGrokRequestConfig(sourceConfig);
    const normalizedKwargs = normalizeGrokInvocationKwargs({
      reasoning_effort: 'none',
      reasoningEffort: 'high',
    });

    expect(normalizedConfig.extraParams.reasoning_effort).toBe('high');
    expect(normalizedConfig.extraParams).not.toHaveProperty('reasoningEffort');
    expect(normalizedKwargs).not.toHaveProperty('reasoning_effort');
    expect(normalizedKwargs).not.toHaveProperty('reasoningEffort');
    expect(sourceConfig.extraParams).toEqual({ reasoning_effort: 'none', reasoningEffort: 'high' });
  });
});
