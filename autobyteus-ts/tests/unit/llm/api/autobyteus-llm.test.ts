import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutobyteusLLM } from '../../../../src/llm/api/autobyteus-llm.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

const buildModel = () =>
  new LLMModel({
    name: 'autobyteus-rpa-model',
    value: 'autobyteus-rpa-model',
    canonicalName: 'autobyteus-rpa-model',
    provider: LLMProvider.AUTOBYTEUS,
    hostUrl: 'https://rpa.example.test'
  });

describe('AutobyteusLLM', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, AUTOBYTEUS_API_KEY: 'test-key' };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('uses logicalConversationId and sends a transcript payload to the client', async () => {
    const llm = new AutobyteusLLM(buildModel(), new LLMConfig());
    const sendMessage = vi.fn().mockResolvedValue({
      response: 'ok',
      token_usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
    });
    (llm as any).client = {
      sendMessage,
      cleanup: vi.fn()
    };

    const response = await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, 'system'),
        new Message(MessageRole.USER, 'first'),
        new Message(MessageRole.ASSISTANT, 'answer'),
        new Message(MessageRole.USER, 'next')
      ],
      null,
      { logicalConversationId: 'run-123' }
    );

    expect(response.content).toBe('ok');
    expect(sendMessage).toHaveBeenCalledWith({
      conversationId: 'run-123',
      modelName: 'autobyteus-rpa-model',
      payload: {
        current_message_index: 3,
        messages: [
          expect.objectContaining({ role: 'system', content: 'system' }),
          expect.objectContaining({ role: 'user', content: 'first' }),
          expect.objectContaining({ role: 'assistant', content: 'answer' }),
          expect.objectContaining({ role: 'user', content: 'next' })
        ]
      }
    });
  });

  it.each([
    ['missing', {}],
    ['empty', { logicalConversationId: '   ' }],
    ['non-string', { logicalConversationId: 123 }]
  ])('rejects %s logicalConversationId before sending to the client', async (_label, kwargs) => {
    const llm = new AutobyteusLLM(buildModel(), new LLMConfig());
    const sendMessage = vi.fn().mockResolvedValue({ response: 'should not be called' });
    const cleanup = vi.fn().mockResolvedValue({});
    (llm as any).client = {
      sendMessage,
      cleanup
    };

    await expect(llm.sendMessages(
      [new Message(MessageRole.USER, 'hello')],
      null,
      kwargs as Record<string, unknown>
    )).rejects.toThrow('AutobyteusLLM requires kwargs.logicalConversationId as a non-empty string.');

    expect(sendMessage).not.toHaveBeenCalled();
    await llm.cleanup();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('rejects missing logicalConversationId before streaming to the client', async () => {
    const llm = new AutobyteusLLM(buildModel(), new LLMConfig());
    const streamMessage = vi.fn(async function* () {
      yield { content: 'should not be called', is_complete: true };
    });
    (llm as any).client = {
      streamMessage,
      cleanup: vi.fn()
    };

    const stream = llm.streamMessages(
      [new Message(MessageRole.USER, 'hello')],
      null,
      {}
    );

    await expect(stream.next()).rejects.toThrow(
      'AutobyteusLLM requires kwargs.logicalConversationId as a non-empty string.'
    );
    expect(streamMessage).not.toHaveBeenCalled();
  });

  it('cleans up every remote conversation id used by the instance', async () => {
    const llm = new AutobyteusLLM(buildModel(), new LLMConfig());
    const sendMessage = vi.fn().mockResolvedValue({ response: 'ok' });
    const cleanup = vi.fn().mockResolvedValue({});
    (llm as any).client = {
      sendMessage,
      cleanup
    };

    const messages = [new Message(MessageRole.USER, 'hello')];

    await llm.sendMessages(messages, null, { logicalConversationId: 'run-1' });
    await llm.sendMessages(messages, null, { logicalConversationId: 'run-2' });
    await llm.cleanup();

    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledWith('run-1');
    expect(cleanup).toHaveBeenCalledWith('run-2');
  });
});
