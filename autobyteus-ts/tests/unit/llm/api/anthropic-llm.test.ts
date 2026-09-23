import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicLLM as ProductionAnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { providerApiKeyResolver, missingProviderApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

// Mock Anthropic Client
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = vi.fn();
  Anthropic.prototype.messages = {
    create: mockCreate
  };
  return { default: Anthropic };
});

const buildModel = (name: string, value = name): LLMModel =>
  new LLMModel({
    name,
    value,
    canonicalName: name,
    provider: LLMProvider.ANTHROPIC
  });

class AnthropicLLM extends ProductionAnthropicLLM {
  constructor(model: LLMModel, config = new LLMConfig()) {
    super(model, config, providerApiKeyResolver('synthetic-anthropic-key'));
  }
}

const currentAdaptiveModels = [
  ['claude-opus-5', 'claude-opus-5'],
  ['claude-opus-4.8', 'claude-opus-4-8'],
  ['claude-sonnet-5', 'claude-sonnet-5'],
  ['claude-fable-5', 'claude-fable-5'],
  ['claude-fable-5-1', 'claude-fable-5-1'],
] as const;

const userMessages = [new Message(MessageRole.USER, { content: 'Hello, Claude.' })];
const internalRuntimeKwargs = {
  logicalConversationId: 'agent-1',
  logical_conversation_id: 'agent-1',
  conversationId: 'conversation-1',
  agentId: 'agent-1',
  turnId: 'turn-1',
  requestId: 'request-1',
  renderedPayload: { internal: true }
};

const expectNoInternalRuntimeKwargs = (params: Record<string, unknown>) => {
  for (const key of Object.keys(internalRuntimeKwargs)) {
    expect(params).not.toHaveProperty(key);
  }
};

async function* emptyStream() {
  // No chunks needed; tests inspect the request payload.
}

describe('AnthropicLLM', () => {
  let llm: AnthropicLLM;

  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 1, output_tokens: 1 }
    });
    const model = buildModel('claude-3-opus');
    
    llm = new AnthropicLLM(model);
  });

  it('sends Opus 5.5 with adaptive thinking and rejects unsupported explicit controls', async () => {
    const opus55 = new AnthropicLLM(buildModel('claude-opus-5-5'));
    await opus55.sendMessages(userMessages);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({ model: 'claude-opus-5-5', thinking: { type: 'adaptive' } });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('temperature');
    await expect(opus55.sendMessages(userMessages, null, { thinking: { type: 'disabled' } })).rejects.toThrow('adaptive thinking only');
    await expect(opus55.sendMessages(userMessages, null, { thinking: { type: 'enabled', budget_tokens: 1024 } })).rejects.toThrow('adaptive thinking only');
    await expect(opus55.sendMessages(userMessages, null, { temperature: 0.5 })).rejects.toThrow('explicit sampling');
    await expect(opus55.sendMessages(userMessages, null, { tool_choice: { type: 'any' } })).rejects.toThrow('forced tool choice');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('streams one complete signed assistant turn alongside display and tool deltas', async () => {
    async function* events() {
      yield { type: 'message_start', message: { usage: { input_tokens: 4, output_tokens: 0 } } };
      yield { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } };
      yield { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'synthetic thought' } };
      yield { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'signed' } };
      yield { type: 'content_block_stop', index: 0 };
      yield { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'search', input: {} } };
      yield { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"q":"x"}' } };
      yield { type: 'content_block_stop', index: 1 };
      yield { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 6 } };
      yield { type: 'message_stop' };
    }
    mockCreate.mockResolvedValueOnce(events());
    const opus55 = new AnthropicLLM(buildModel('claude-opus-5-5'));
    const chunks = [];
    for await (const chunk of opus55.streamMessages(userMessages)) chunks.push(chunk);
    expect(chunks.some((chunk) => chunk.reasoning === 'synthetic thought')).toBe(true);
    expect(chunks.some((chunk) => chunk.tool_calls?.[0]?.call_id === 'toolu_1')).toBe(true);
    expect(chunks.find((chunk) => chunk.providerNativeAssistantTurn)?.providerNativeAssistantTurn?.blocks).toEqual([
      { type: 'thinking', thinking: 'synthetic thought', signature: 'signed' },
      { type: 'tool_use', id: 'toolu_1', name: 'search', input: { q: 'x' } },
    ]);
    expect(chunks.find((chunk) => chunk.is_complete)?.usage?.output_tokens).toBe(6);
  });

  it('should initialize with API key', () => {
    expect(llm).toBeDefined();
  });
  
  it('fails at first use if the required provider key is missing', async () => {
    const model = buildModel('claude');
    const missing = new ProductionAnthropicLLM(
      model,
      new LLMConfig(),
      missingProviderApiKeyResolver(),
    );
    await expect(missing.sendMessages(userMessages)).rejects.toThrow(
      'SYNTHETIC_API_KEY_MISSING',
    );
  });

  it('omits Opus 4.7 fallback temperature and filters internal thinking fields when thinking is disabled', async () => {
    const opus47 = new AnthropicLLM(
      buildModel('claude-opus-4.7', 'claude-opus-4-7'),
      new LLMConfig({
        extraParams: {
          thinking_enabled: false,
          thinking_budget_tokens: 32000,
          thinking_display: 'summarized'
        }
      })
    );

    await opus47.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-opus-4-7');
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('thinking_enabled');
    expect(params).not.toHaveProperty('thinking_budget_tokens');
    expect(params).not.toHaveProperty('thinking_display');
  });

  it('maps Opus 4.7 schema thinking to adaptive thinking without a fixed budget', async () => {
    const opus47 = new AnthropicLLM(
      buildModel('claude-opus-4.7', 'claude-opus-4-7'),
      new LLMConfig({
        extraParams: {
          thinking_enabled: true,
          thinking_budget_tokens: 32000,
          thinking_display: 'summarized'
        }
      })
    );

    await opus47.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('thinking_enabled');
    expect(params).not.toHaveProperty('thinking_budget_tokens');
    expect(params).not.toHaveProperty('thinking_display');
  });

  it.each(currentAdaptiveModels)('omits fallback sampling defaults for %s default requests', async (name, value) => {
    const llm = new AnthropicLLM(buildModel(name, value));

    await llm.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe(value);
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('top_p');
    expect(params).not.toHaveProperty('top_k');
  });

  it.each(currentAdaptiveModels)('maps %s schema thinking to provider-valid adaptive thinking', async (name, value) => {
    const llm = new AnthropicLLM(
      buildModel(name, value),
      new LLMConfig({
        extraParams: {
          thinking_enabled: true,
          thinking_budget_tokens: 32000,
          thinking_display: 'summarized'
        }
      })
    );

    await llm.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe(value);
    expect(params.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('thinking_enabled');
    expect(params).not.toHaveProperty('thinking_budget_tokens');
    expect(params).not.toHaveProperty('thinking_display');
  });

  it('preserves explicit provider thinking over Opus 4.7 schema-generated thinking', async () => {
    const opus47 = new AnthropicLLM(
      buildModel('claude-opus-4.7', 'claude-opus-4-7'),
      new LLMConfig({
        extraParams: {
          thinking_enabled: true
        }
      })
    );

    await opus47.sendMessages(userMessages, null, {
      thinking: { type: 'adaptive', display: 'omitted' }
    });

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
  });

  it('filters internal runtime kwargs on sync requests while preserving provider-safe fields', async () => {
    const tools = [
      {
        name: 'get_weather',
        description: 'Return weather.',
        input_schema: { type: 'object', properties: {}, required: [] }
      }
    ];
    const opus47 = new AnthropicLLM(buildModel('claude-opus-4.7', 'claude-opus-4-7'));

    await opus47.sendMessages(userMessages, null, {
      ...internalRuntimeKwargs,
      metadata: { user_id: 'test-user' },
      tools,
      thinking: { type: 'adaptive', display: 'omitted' }
    });

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expectNoInternalRuntimeKwargs(params);
    expect(params.metadata).toEqual({ user_id: 'test-user' });
    expect(params.tools).toBe(tools);
    expect(params.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
  });

  it('filters internal runtime keys from Anthropic config extra params', async () => {
    const opus46 = new AnthropicLLM(
      buildModel('claude-opus-4.6', 'claude-opus-4-6'),
      new LLMConfig({
        extraParams: {
          ...internalRuntimeKwargs,
          metadata: { user_id: 'config-user' }
        }
      })
    );

    await opus46.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expectNoInternalRuntimeKwargs(params);
    expect(params.metadata).toEqual({ user_id: 'config-user' });
  });

  it('drops provider-invalid manual thinking and sampling overrides for Sonnet 5', async () => {
    const sonnet5 = new AnthropicLLM(buildModel('claude-sonnet-5', 'claude-sonnet-5'));

    await sonnet5.sendMessages(userMessages, null, {
      thinking: { type: 'enabled', budget_tokens: 32000 },
      temperature: 0.2,
      top_p: 0.9,
      top_k: 40
    });

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-sonnet-5');
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('top_p');
    expect(params).not.toHaveProperty('top_k');
  });

  it.each([
    'claude-fable-5',
    'claude-fable-5-1',
  ])('does not send manual thinking or unsupported sampling parameters to %s', async (modelId) => {
    const fable = new AnthropicLLM(buildModel(modelId, modelId));

    await fable.sendMessages(userMessages, null, {
      thinking: { type: 'disabled' },
      temperature: 0,
      top_p: 1,
      top_k: 40,
    });

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe(modelId);
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('top_p');
    expect(params).not.toHaveProperty('top_k');
  });

  it('drops fixed-budget thinking for Fable 5.1', async () => {
    const fable = new AnthropicLLM(buildModel('claude-fable-5-1'));

    await fable.sendMessages(userMessages, null, {
      thinking: { type: 'enabled', budget_tokens: 32_000 },
    });

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-fable-5-1');
    expect(params).not.toHaveProperty('thinking');
  });

  it('passes invocation AbortSignal to sync message requests', async () => {
    const controller = new AbortController();

    await llm.sendMessages(userMessages, null, {}, { signal: controller.signal });

    expect(mockCreate.mock.calls[0]?.[1]).toEqual({ signal: controller.signal });
  });

  it('preserves fixed-budget thinking behavior for older Claude models without leaking internal fields', async () => {
    const opus46 = new AnthropicLLM(
      buildModel('claude-opus-4.6', 'claude-opus-4-6'),
      new LLMConfig({
        extraParams: {
          thinking_enabled: true,
          thinking_budget_tokens: 4096
        }
      })
    );

    await opus46.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.thinking).toEqual({ type: 'enabled', budget_tokens: 4096 });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('thinking_enabled');
    expect(params).not.toHaveProperty('thinking_budget_tokens');
  });

  it('keeps fallback temperature for older Claude models when no thinking is sent', async () => {
    const opus46 = new AnthropicLLM(buildModel('claude-opus-4.6', 'claude-opus-4-6'));

    await opus46.sendMessages(userMessages);

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.temperature).toBe(0);
    expect(params).not.toHaveProperty('thinking');
  });

  it('applies Opus 4.7 adaptive thinking filtering on streaming requests', async () => {
    mockCreate.mockResolvedValueOnce(emptyStream());
    const opus47 = new AnthropicLLM(
      buildModel('claude-opus-4.7', 'claude-opus-4-7'),
      new LLMConfig({
        extraParams: {
          thinking_enabled: true,
          thinking_budget_tokens: 32000,
          thinking_display: 'summarized'
        }
      })
    );

    for await (const _chunk of opus47.streamMessages(userMessages)) {
      // consume stream
    }

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.stream).toBe(true);
    expect(params.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('thinking_enabled');
    expect(params).not.toHaveProperty('thinking_budget_tokens');
    expect(params).not.toHaveProperty('thinking_display');
  });

  it.each(currentAdaptiveModels)('applies %s current-model request policy on streaming requests', async (name, value) => {
    mockCreate.mockResolvedValueOnce(emptyStream());
    const llm = new AnthropicLLM(
      buildModel(name, value),
      new LLMConfig({
        extraParams: {
          thinking_enabled: true,
          thinking_budget_tokens: 32000
        }
      })
    );

    for await (const _chunk of llm.streamMessages(userMessages, null, {
      temperature: 0,
      top_p: 1
    })) {
      // consume stream
    }

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe(value);
    expect(params.stream).toBe(true);
    expect(params.thinking).toEqual({ type: 'adaptive' });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('top_p');
    expect(params).not.toHaveProperty('thinking_budget_tokens');
  });

  it('filters internal runtime kwargs on streaming requests while preserving provider-safe fields', async () => {
    mockCreate.mockResolvedValueOnce(emptyStream());
    const tools = [
      {
        name: 'get_time',
        description: 'Return time.',
        input_schema: { type: 'object', properties: {}, required: [] }
      }
    ];
    const opus47 = new AnthropicLLM(buildModel('claude-opus-4.7', 'claude-opus-4-7'));

    for await (const _chunk of opus47.streamMessages(userMessages, null, {
      ...internalRuntimeKwargs,
      metadata: { user_id: 'stream-user' },
      tools,
      thinking: { type: 'adaptive' }
    })) {
      // consume stream
    }

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.stream).toBe(true);
    expectNoInternalRuntimeKwargs(params);
    expect(params.metadata).toEqual({ user_id: 'stream-user' });
    expect(params.tools).toBe(tools);
    expect(params.thinking).toEqual({ type: 'adaptive' });
  });

  it('passes invocation AbortSignal to streaming message requests', async () => {
    mockCreate.mockResolvedValueOnce(emptyStream());
    const controller = new AbortController();

    for await (const _chunk of llm.streamMessages(userMessages, null, {}, { signal: controller.signal })) {
      // consume stream
    }

    expect(mockCreate.mock.calls[0]?.[1]).toEqual({ signal: controller.signal });
  });
});
