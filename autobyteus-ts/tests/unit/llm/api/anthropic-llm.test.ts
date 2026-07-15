import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

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

const currentAdaptiveModels = [
  ['claude-opus-4.8', 'claude-opus-4-8'],
  ['claude-sonnet-5', 'claude-sonnet-5'],
  ['claude-fable-5', 'claude-fable-5'],
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
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const model = buildModel('claude-3-opus');
    
    llm = new AnthropicLLM(model);
  });

  it('should initialize with API key', () => {
    expect(llm).toBeDefined();
  });
  
  it('should throw if API key missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const model = buildModel('claude');
    expect(() => new AnthropicLLM(model)).toThrow(/environment variable is not set/);
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

  it('does not send disabled thinking or unsupported sampling parameters to Fable 5', async () => {
    const fable5 = new AnthropicLLM(buildModel('claude-fable-5', 'claude-fable-5'));

    await fable5.sendMessages(userMessages, null, {
      thinking: { type: 'disabled' },
      temperature: 0,
      top_p: 1
    });

    const params = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('claude-fable-5');
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('top_p');
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
