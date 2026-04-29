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

const userMessages = [new Message(MessageRole.USER, { content: 'Hello, Claude.' })];

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
});
