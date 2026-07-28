import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekLLM as ProductionDeepSeekLLM } from '../../../../src/llm/api/deepseek-llm.js';
import { OpenAICompatibleLLM as ProductionOpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole, ToolCallPayload } from '../../../../src/llm/utils/messages.js';
import { providerApiKeyResolver, missingProviderApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const mockCreate = vi.hoisted(() => vi.fn());
const mockOpenAIConstructor = vi.hoisted(
  () =>
    vi.fn(function (
      this: { chat: { completions: { create: typeof mockCreate } } },
      _options?: Record<string, unknown>,
    ) {
      this.chat = {
        completions: {
          create: mockCreate,
        },
      };
    }),
);

// Mock OpenAI Client
vi.mock('openai', () => {
  return { OpenAI: mockOpenAIConstructor };
});

async function* createStream(parts: any[]) {
  for (const part of parts) {
    yield part;
  }
}

class OpenAICompatibleLLM extends ProductionOpenAICompatibleLLM {
  constructor(model: LLMModel, _legacyAlias: string, baseUrl: string, config = new LLMConfig()) {
    super(
      model,
      baseUrl,
      config,
      providerApiKeyResolver('synthetic-openai-compatible-key'),
      model.provider,
    );
  }
}

const buildDeepSeekModel = () => new LLMModel({
  name: 'deepseek-v4-flash',
  value: 'deepseek-v4-flash',
  canonicalName: 'deepseek-v4-flash',
  provider: LLMProvider.DEEPSEEK,
});

class DeepSeekLLM extends ProductionDeepSeekLLM {
  constructor() {
    super(
      buildDeepSeekModel(),
      new LLMConfig(),
      providerApiKeyResolver('synthetic-deepseek-key'),
    );
  }
}

describe('OpenAICompatibleLLM', () => {
  let llm: OpenAICompatibleLLM;
  
  beforeEach(() => {
    mockCreate.mockReset();
    mockOpenAIConstructor.mockClear();
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI
    });
    
    llm = new OpenAICompatibleLLM(
      model,
      'TEST_API_KEY',
      'https://api.openai.com/v1'
    );
  });

  it('constructs without resolving and initializes with the provider key on first use', async () => {
    expect(llm).toBeDefined();
    expect(mockOpenAIConstructor).not.toHaveBeenCalled();
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'hello' } }],
    });
    await llm.sendMessages([]);
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: 'synthetic-openai-compatible-key',
      baseURL: 'https://api.openai.com/v1',
    });
  });

  it('fails at first use if the required provider key is missing', async () => {
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI
    });
    
    const missing = new ProductionOpenAICompatibleLLM(
      model,
      'https://example.test/v1',
      new LLMConfig(),
      missingProviderApiKeyResolver(),
      LLMProvider.OPENAI,
    );
    await expect(missing.sendMessages([])).rejects.toThrow('SYNTHETIC_API_KEY_MISSING');
  });

  it('maps reasoning_content on sync responses into CompleteResponse.reasoning', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'hello',
            reasoning_content: 'private reasoning'
          }
        }
      ],
      usage: {
        prompt_tokens: 1,
        completion_tokens: 2,
        total_tokens: 3
      }
    });

    const response = await llm.sendMessages([]);

    expect(response.content).toBe('hello');
    expect(response.reasoning).toBe('private reasoning');
    expect(response.usage?.total_tokens).toBe(3);
  });

  it('passes invocation AbortSignal to sync chat completion requests', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'hello' } }],
      usage: {
        prompt_tokens: 1,
        completion_tokens: 1,
        total_tokens: 2
      }
    });
    const controller = new AbortController();

    await llm.sendMessages([], null, {}, { signal: controller.signal });

    expect(mockCreate.mock.calls[0]?.[1]).toEqual({ signal: controller.signal });
  });

  it('omits reasoning_content from default OpenAI-compatible request payloads', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }]
    });

    await llm.sendMessages([
      new Message(MessageRole.ASSISTANT, {
        content: 'I will inspect the workspace.',
        reasoning_content: 'generic clients should not emit this field',
        tool_payload: new ToolCallPayload([
          { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } }
        ])
      })
    ]);

    const [params] = mockCreate.mock.calls.at(-1) ?? [];
    expect(params.messages[0]).toMatchObject({
      role: 'assistant',
      content: 'I will inspect the workspace.',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'run_bash',
            arguments: JSON.stringify({ command: 'pwd' })
          }
        }
      ]
    });
    expect(params.messages[0]).not.toHaveProperty('reasoning_content');
  });

  it('uses DeepSeekChatRenderer from DeepSeekLLM to emit reasoning_content request payloads', async () => {
    const deepSeek = new DeepSeekLLM();
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }]
    });

    await deepSeek.sendMessages([
      new Message(MessageRole.ASSISTANT, {
        content: 'I will inspect the workspace.',
        reasoning_content: 'DeepSeek requires this replay field',
        tool_payload: new ToolCallPayload([
          { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } }
        ])
      })
    ]);

    const [params] = mockCreate.mock.calls.at(-1) ?? [];
    expect(params.model).toBe('deepseek-v4-flash');
    expect(params.messages[0]).toMatchObject({
      role: 'assistant',
      content: 'I will inspect the workspace.',
      reasoning_content: 'DeepSeek requires this replay field',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'run_bash',
            arguments: JSON.stringify({ command: 'pwd' })
          }
        }
      ]
    });
  });

  it('maps alternate reasoning field on sync responses into CompleteResponse.reasoning', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'hello',
            reasoning: 'alternate reasoning'
          }
        }
      ],
      usage: {
        prompt_tokens: 1,
        completion_tokens: 2,
        total_tokens: 3
      }
    });

    const response = await llm.sendMessages([]);

    expect(response.reasoning).toBe('alternate reasoning');
  });

  it('emits reasoning chunks from streamed reasoning_content while preserving normal content and tool calls', async () => {
    mockCreate.mockResolvedValue(
      createStream([
        {
          choices: [
            {
              delta: {
                reasoning_content: 'reasoning token '
              }
            }
          ]
        },
        {
          choices: [
            {
              delta: {
                content: 'answer token '
              }
            }
          ]
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    function: {
                      name: 'search_query',
                      arguments: '{"q":"hello"}'
                    }
                  }
                ]
              }
            }
          ]
        },
        {
          choices: [],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 7,
            total_tokens: 12
          }
        }
      ])
    );

    const chunks = [];
    for await (const chunk of llm.streamMessages([])) {
      chunks.push(chunk);
    }

    expect(chunks.some((chunk) => chunk.reasoning === 'reasoning token ')).toBe(true);
    expect(chunks.some((chunk) => chunk.content === 'answer token ')).toBe(true);
    expect(chunks.find((chunk) => chunk.tool_calls?.length)?.tool_calls).toEqual([
      {
        index: 0,
        call_id: 'call_123',
        name: 'search_query',
        arguments_delta: '{"q":"hello"}'
      }
    ]);
    expect(chunks.at(-1)?.is_complete).toBe(true);
    expect(chunks.at(-1)?.usage?.total_tokens).toBe(12);
  });

  it('passes invocation AbortSignal to streaming chat completion requests', async () => {
    mockCreate.mockResolvedValue(createStream([]));
    const controller = new AbortController();

    for await (const _chunk of llm.streamMessages([], null, {}, { signal: controller.signal })) {
      // consume stream
    }

    expect(mockCreate.mock.calls[0]?.[1]).toEqual({ signal: controller.signal });
  });

  it('emits reasoning chunks from streamed alternate reasoning fields', async () => {
    mockCreate.mockResolvedValue(
      createStream([
        {
          choices: [
            {
              delta: {
                reasoning: 'alternate reasoning token'
              }
            }
          ]
        },
        {
          choices: [],
          usage: {
            prompt_tokens: 2,
            completion_tokens: 4,
            total_tokens: 6
          }
        }
      ])
    );

    const chunks = [];
    for await (const chunk of llm.streamMessages([])) {
      chunks.push(chunk);
    }

    expect(chunks.some((chunk) => chunk.reasoning === 'alternate reasoning token')).toBe(true);
    expect(chunks.at(-1)?.is_complete).toBe(true);
  });

  it('keeps default client timeout/fetch behavior for non-LM-Studio providers', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    });
    await llm.sendMessages([]);
    expect(mockOpenAIConstructor).toHaveBeenCalledTimes(1);
    const [clientOptions] = mockOpenAIConstructor.mock.calls.at(0) ?? [];

    expect(clientOptions).toEqual({
      apiKey: 'synthetic-openai-compatible-key',
      baseURL: 'https://api.openai.com/v1',
    });
    expect(clientOptions).not.toHaveProperty('timeout');
    expect(clientOptions).not.toHaveProperty('fetch');
  });

  it('sends mapped OpenAI-compatible params while filtering internal kwargs', async () => {
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI
    });
    const configured = new OpenAICompatibleLLM(
      model,
      'TEST_API_KEY',
      'https://api.openai.com/v1',
      new LLMConfig({
        temperature: 0,
        topP: 0.4,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1,
        stopSequences: ['STOP'],
        maxTokens: 42,
        extraParams: { chat_template_kwargs: { enable_thinking: false } }
      })
    );
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }]
    });
    const tools = [
      {
        type: 'function',
        function: {
          name: 'run_bash',
          description: 'Run command',
          parameters: { type: 'object', properties: {}, required: [], additionalProperties: false }
        }
      }
    ];

    await configured.sendMessages([], null, {
      logicalConversationId: 'agent-1',
      tools,
      tool_choice: 'required'
    });

    const [params] = mockCreate.mock.calls.at(-1) ?? [];
    expect(params).toMatchObject({
      model: 'gpt-4o',
      temperature: 0,
      top_p: 0.4,
      frequency_penalty: 0.2,
      presence_penalty: 0.1,
      stop: ['STOP'],
      max_completion_tokens: 42,
      chat_template_kwargs: { enable_thinking: false },
      tools,
      tool_choice: 'required'
    });
    expect(params).not.toHaveProperty('logicalConversationId');
  });
});
