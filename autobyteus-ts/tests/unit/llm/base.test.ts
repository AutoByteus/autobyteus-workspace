import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMExtension } from '../../../src/llm/extensions/base-extension.js';

class ConcreteLLM extends BaseLLM {
  lastMessages: Message[] | null = null;

  lastKwargs: Record<string, unknown> | null = null;
  lastOptions: unknown = null;

  async _sendMessagesToLLM(messages: Message[], kwargs: Record<string, unknown>, options?: unknown): Promise<CompleteResponse> {
    this.lastMessages = messages;
    this.lastKwargs = kwargs;
    this.lastOptions = options;
    return new CompleteResponse({ content: 'Mock response' });
  }

  async *_streamMessagesToLLM(messages: Message[], _kwargs: Record<string, unknown>): AsyncGenerator<ChunkResponse, void, unknown> {
    this.lastMessages = messages;
    yield new ChunkResponse({ content: 'Mock' });
    yield new ChunkResponse({ content: ' Stream', is_complete: true });
  }
}

describe('BaseLLM', () => {
  let model: LLMModel;
  let config: LLMConfig;
  let llm: ConcreteLLM;

  beforeEach(() => {
    config = new LLMConfig();
    model = new LLMModel({ 
      name: 'test', 
      value: 'test', 
      canonicalName: 'test',
      provider: LLMProvider.OPENAI 
    });
    llm = new ConcreteLLM(model, config);
  });

  it('should initialize with system message', () => {
    expect(llm.systemMessage).toContain('helpful assistant');
    expect(llm.config.systemMessage).toContain('helpful assistant');
  });

  it('should send user message and build system + user messages', async () => {
    const resp = await llm.sendUserMessage(new LLMUserMessage({ content: 'Hi' }));
    expect(resp.content).toBe('Mock response');
    expect(llm.lastMessages).toHaveLength(2);
    expect(llm.lastMessages?.[0].role).toBe(MessageRole.SYSTEM);
    expect(llm.lastMessages?.[1].role).toBe(MessageRole.USER);
    expect(llm.lastMessages?.[1].content).toBe('Hi');
  });

  it('should stream messages with explicit list', async () => {
    const messages = [new Message(MessageRole.USER, 'Hello')];
    const chunks: string[] = [];
    for await (const chunk of llm.streamMessages(messages)) {
      if (chunk.content) chunks.push(chunk.content);
    }
    expect(chunks.join('')).toBe('Mock Stream');
    expect(llm.lastMessages).toEqual(messages);
  });

  it('passes (messages, kwargs, options) to the provider and (messages, kwargs) to extension hooks', async () => {
    const hooks: unknown[][] = [];
    class RecordingExtension extends LLMExtension {
      async beforeInvoke(...args: unknown[]): Promise<void> { hooks.push(['before', ...args]); }
      async afterInvoke(...args: unknown[]): Promise<void> { hooks.push(['after', ...args]); }
    }
    llm.registerExtension(new RecordingExtension(llm));
    const messages = [new Message(MessageRole.USER, 'hi')];
    const kwargs = { tools: [{ name: 'tool' }] };
    const options = { promptCacheScope: 'conversation' as const };

    await llm.sendMessages(messages, kwargs, options);

    expect(llm.lastKwargs).toBe(kwargs);
    expect(llm.lastOptions).toBe(options);
    expect(hooks[0]).toEqual(['before', messages, kwargs]);
    expect(hooks[1]![0]).toBe('after');
    expect(hooks[1]![3]).toBe(kwargs);
  });

  it('should configure system prompt', () => {
    llm.configureSystemPrompt('New prompt');
    expect(llm.systemMessage).toBe('New prompt');
    expect(llm.config.systemMessage).toBe('New prompt');

    llm.configureSystemPrompt('New prompt 2');
    expect(llm.systemMessage).toBe('New prompt 2');
    expect(llm.config.systemMessage).toBe('New prompt 2');
  });
});
