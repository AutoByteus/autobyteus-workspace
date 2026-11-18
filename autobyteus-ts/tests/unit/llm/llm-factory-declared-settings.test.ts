/**
 * AC-007 / AC-002: only the settings a catalog row declares (plus standard config fields and the row's
 * own defaults) reach the provider adapter, whatever an older run stored. Every case builds the
 * adapter through `LLMFactory.createLLM` with the catalog's real rows, as a run activation does.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import {
  geminiProviderApiKeyResolver,
  geminiRuntimeResolver,
  providerApiKeyResolver,
} from '../provider-api-key-resolver-test-helpers.js';

const mockAnthropicCreate = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = vi.fn();
  Anthropic.prototype.messages = { create: mockAnthropicCreate };
  return { default: Anthropic };
});

const UNDECLARED = { undeclared_probe: 'must-not-travel', thinking_display: 'summarized' };
const userMessages = [new Message(MessageRole.USER, { content: 'Hello.' })];

describe('declared settings reach every adapter family (AC-007)', () => {
  beforeAll(async () => {
    await LLMFactory.ensureInitialized();
  });

  it.each([
    ['OpenAI Responses', 'gpt-6.1-terra', { reasoning_effort: 'low' }],
    ['Gemini', 'gemini-3.8-flash', { thinking_level: 'low' }],
    ['OpenAI-compatible (Grok)', 'grok-4.7', { reasoning_effort: 'low' }],
  ] as const)('%s keeps the declared key and drops the undeclared ones', async (_family, modelIdentifier, declared) => {
    const llm = await LLMFactory.createLLM(
      modelIdentifier,
      { ...declared, ...UNDECLARED, extra_params: { another_undeclared: 1 } },
      providerApiKeyResolver('synthetic-key'),
      modelIdentifier.startsWith('gemini') ? geminiRuntimeResolver() : undefined,
    );
    for (const [key, value] of Object.entries(declared)) {
      expect(llm.config.extraParams[key], key).toBe(value);
    }
    for (const key of [...Object.keys(UNDECLARED), 'another_undeclared']) {
      expect(llm.config.extraParams, key).not.toHaveProperty(key);
    }
  });

  it.each([
    ['Mistral', 'mistral-large-3'],
    ['OpenAI-compatible (Qwen)', 'qwen3.7-max'],
    ['OpenAI-compatible (MiniMax)', 'minimax-m3'],
  ] as const)('%s declares no settings, so no stored key is sent', async (_family, modelIdentifier) => {
    const llm = await LLMFactory.createLLM(
      modelIdentifier,
      { reasoning_effort: 'low', ...UNDECLARED },
      providerApiKeyResolver('synthetic-key'),
    );
    expect(llm.config.extraParams).toEqual({});
  });

  it('keeps a Gemini model usable with its own defaults when nothing declared is stored', async () => {
    const llm = await LLMFactory.createLLM(
      'gemini-3.8-flash',
      UNDECLARED,
      geminiProviderApiKeyResolver({ aiStudio: 'synthetic-gemini-key' }),
      geminiRuntimeResolver(),
    );
    expect(llm.config.extraParams).toEqual({});
  });
});

describe('stored Claude config reaches the Anthropic request through the factory', () => {
  beforeEach(() => {
    mockAnthropicCreate.mockReset();
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });
  });

  const requestFor = async (modelIdentifier: string, stored: Record<string, unknown>) => {
    const llm = await LLMFactory.createLLM(modelIdentifier, stored, providerApiKeyResolver('synthetic-anthropic-key'));
    await llm.sendMessages(userMessages);
    return mockAnthropicCreate.mock.calls[0]?.[0] as Record<string, unknown>;
  };

  it.each(['claude-fable-5', 'claude-fable-5-1'])(
    '%s ignores a stored thinking switch: adaptive thinking and the stored effort, no local failure (AC-002)',
    async (modelIdentifier) => {
      const params = await requestFor(modelIdentifier, { thinking_enabled: false, reasoning_effort: 'max' });
      expect(params.thinking).toEqual({ type: 'adaptive' });
      expect(params.output_config).toEqual({ effort: 'max' });
    },
  );

  it('claude-opus-5 stored Off sends disabled thinking and no effort, whatever effort is stored (AC-001)', async () => {
    const params = await requestFor('claude-opus-5', { thinking_enabled: false, reasoning_effort: 'max' });
    expect(params.thinking).toEqual({ type: 'disabled' });
    expect(params).not.toHaveProperty('output_config');
  });

  it('reads a switch stored inside the extra_params container as the top-level setting', async () => {
    const params = await requestFor('claude-sonnet-5', { extra_params: { thinking_enabled: false, reasoning_effort: 'xhigh' } });
    expect(params.thinking).toEqual({ type: 'disabled' });
    expect(params).not.toHaveProperty('output_config');
  });

  it.each(['claude-opus-5', 'claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'])(
    '%s with the catalog defaults (switch On) sends adaptive thinking (AC-003)',
    async (modelIdentifier) => {
      const modelInfo = (await LLMFactory.listAvailableModels()).find((model) => model.model_identifier === modelIdentifier)!;
      const defaults = Object.fromEntries(
        Object.entries((modelInfo.config_schema as { properties: Record<string, { default?: unknown }> }).properties)
          .map(([key, value]) => [key, value.default]),
      );
      expect(defaults.thinking_enabled).toBe(true);
      const params = await requestFor(modelIdentifier, defaults);
      expect(params.thinking).toEqual({ type: 'adaptive' });
    },
  );
});
