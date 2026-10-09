import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = vi.fn();
  Anthropic.prototype.messages = { create: mockCreate };
  return { default: Anthropic };
});

const ONE_HOUR = { type: 'ephemeral', ttl: '1h' };
const tools = [{ name: 'read_file', description: 'Read a file', input_schema: { type: 'object', properties: {} } }];

const buildLlm = (value = 'claude-opus-5-5', config = new LLMConfig()) => new AnthropicLLM(
  new LLMModel({ name: value, value, canonicalName: value, provider: LLMProvider.ANTHROPIC }),
  config,
  providerApiKeyResolver('synthetic-anthropic-key'),
);

const conversation = [
  new Message(MessageRole.SYSTEM, { content: 'You are a careful agent.' }),
  new Message(MessageRole.USER, { content: 'Hello.' }),
];

async function* completedStream() {
  yield { type: 'message_start', message: { usage: { input_tokens: 1, output_tokens: 0 } } };
  yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } };
}

const lastRequest = (): Record<string, any> => mockCreate.mock.calls.at(-1)![0];

describe('AnthropicLLM prompt caching', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } });
  });

  it('marks the system block and requests top-level 1h automatic caching for a conversation request (sync)', async () => {
    await buildLlm().sendMessages(conversation, { tools }, { promptCacheScope: 'conversation' });

    const request = lastRequest();
    expect(request.system).toEqual([{ type: 'text', text: 'You are a careful agent.', cache_control: ONE_HOUR }]);
    expect(request.cache_control).toEqual(ONE_HOUR);
    expect(request.tools).toEqual(tools);
    expect(request.messages).toEqual([{ role: 'user', content: 'Hello.' }]);
    expect(request).not.toHaveProperty('stream');
    expect(request.thinking).toEqual({ type: 'adaptive' });
  });

  it('applies the same markers on the streaming path', async () => {
    mockCreate.mockResolvedValue(completedStream());
    for await (const _chunk of buildLlm().streamMessages(conversation, { tools }, { promptCacheScope: 'conversation' })) {
      // drain
    }

    const request = lastRequest();
    expect(request.stream).toBe(true);
    expect(request.system).toEqual([{ type: 'text', text: 'You are a careful agent.', cache_control: ONE_HOUR }]);
    expect(request.cache_control).toEqual(ONE_HOUR);
  });

  it('sends a one-shot request without any cache marker and with the system prompt unchanged', async () => {
    await buildLlm().sendMessages(conversation, { tools });

    const request = lastRequest();
    expect(request.system).toBe('You are a careful agent.');
    expect(request).not.toHaveProperty('cache_control');
    expect(JSON.stringify(request)).not.toContain('cache_control');
  });

  it('uses only the top-level marker when a conversation has no system prompt', async () => {
    await buildLlm().sendMessages([conversation[1]!], {}, { promptCacheScope: 'conversation' });

    const request = lastRequest();
    expect(request).not.toHaveProperty('system');
    expect(request.cache_control).toEqual(ONE_HOUR);
  });

  it('keeps the leading system run as the top-level system and renders a late SYSTEM note in place as user text', async () => {
    const note = "System note: turn 'turn_2' was interrupted before normal completion.";
    await buildLlm().sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a careful agent.' }),
      new Message(MessageRole.SYSTEM, { content: 'Carried compaction note.' }),
      new Message(MessageRole.USER, { content: 'First.' }),
      new Message(MessageRole.ASSISTANT, { content: 'Done.' }),
      new Message(MessageRole.SYSTEM, { content: note }),
      new Message(MessageRole.USER, { content: 'Next.' }),
    ], {}, { promptCacheScope: 'conversation' });

    const request = lastRequest();
    expect(request.system).toEqual([
      { type: 'text', text: 'You are a careful agent.\nCarried compaction note.', cache_control: ONE_HOUR },
    ]);
    expect(request.messages).toEqual([
      { role: 'user', content: 'First.' },
      { role: 'assistant', content: 'Done.' },
      { role: 'user', content: note },
      { role: 'user', content: 'Next.' },
    ]);
  });

  it('does not let kwargs or config extra params override the adapter-owned cache_control', async () => {
    const llm = buildLlm('claude-opus-5-5', new LLMConfig({ extraParams: { cache_control: { type: 'ephemeral', ttl: '5m' } } }));

    await llm.sendMessages(conversation, { cache_control: { type: 'ephemeral' } }, { promptCacheScope: 'conversation' });
    expect(lastRequest().cache_control).toEqual(ONE_HOUR);

    await llm.sendMessages(conversation, { cache_control: { type: 'ephemeral' } });
    expect(lastRequest()).not.toHaveProperty('cache_control');
  });
});
