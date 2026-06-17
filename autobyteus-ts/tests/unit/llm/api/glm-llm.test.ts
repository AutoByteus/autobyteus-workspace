import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlmLLM } from '../../../../src/llm/api/glm-llm.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => {
  const OpenAI = vi.fn();
  OpenAI.prototype.chat = {
    completions: {
      create: mockCreate
    }
  };
  return { OpenAI };
});

describe('GlmLLM', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.GLM_API_KEY = 'glm-test-key';
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
      usage: {
        prompt_tokens: 1,
        completion_tokens: 1,
        total_tokens: 2
      }
    });
  });

  it('defaults to glm-5.2', async () => {
    const llm = new GlmLLM();

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
      new Message(MessageRole.USER, { content: 'Say pong.' })
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'glm-5.2'
    });
  });

  it('maps enabled thinking_type to provider thinking and preserves reasoning_effort', async () => {
    const llm = new GlmLLM(undefined, new LLMConfig({
      extraParams: {
        thinking_type: 'enabled',
        reasoning_effort: 'max'
      }
    }));

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
      new Message(MessageRole.USER, { content: 'Say pong.' })
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'glm-5.2',
      thinking: { type: 'enabled' },
      reasoning_effort: 'max'
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking_type');
  });

  it('removes reasoning_effort when thinking_type disables thinking', async () => {
    const llm = new GlmLLM(undefined, new LLMConfig({
      extraParams: {
        thinking_type: 'disabled',
        reasoning_effort: 'max'
      }
    }));

    await llm.sendMessages([
      new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
      new Message(MessageRole.USER, { content: 'Say pong.' })
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'glm-5.2',
      thinking: { type: 'disabled' }
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking_type');
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('reasoning_effort');
  });


  it('maps per-request thinking_type kwargs without leaking the flat key', async () => {
    const llm = new GlmLLM();

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
        new Message(MessageRole.USER, { content: 'Say pong.' })
      ],
      null,
      {
        thinking_type: 'enabled',
        reasoning_effort: 'max'
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'glm-5.2',
      thinking: { type: 'enabled' },
      reasoning_effort: 'max'
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking_type');
  });

  it('prunes per-request reasoning_effort kwargs when per-request thinking_type disables thinking', async () => {
    const llm = new GlmLLM();

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
        new Message(MessageRole.USER, { content: 'Say pong.' })
      ],
      null,
      {
        thinking_type: 'disabled',
        reasoning_effort: 'max'
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'glm-5.2',
      thinking: { type: 'disabled' }
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking_type');
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('reasoning_effort');
  });


  it('prunes config reasoning_effort when per-request thinking_type disables thinking', async () => {
    const llm = new GlmLLM(undefined, new LLMConfig({
      extraParams: {
        thinking_type: 'enabled',
        reasoning_effort: 'max'
      }
    }));

    await llm.sendMessages(
      [
        new Message(MessageRole.SYSTEM, { content: 'You are a helpful assistant.' }),
        new Message(MessageRole.USER, { content: 'Say pong.' })
      ],
      null,
      {
        thinking_type: 'disabled'
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'glm-5.2',
      thinking: { type: 'disabled' }
    });
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('thinking_type');
    expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('reasoning_effort');
  });
});
