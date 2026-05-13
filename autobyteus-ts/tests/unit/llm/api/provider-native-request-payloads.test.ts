import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { MistralLLM } from '../../../../src/llm/api/mistral-llm.js';
import { OllamaLLM } from '../../../../src/llm/api/ollama-llm.js';
import { OpenAIResponsesLLM } from '../../../../src/llm/api/openai-responses-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
  type ToolCallSpec
} from '../../../../src/llm/utils/messages.js';

const originalEnv = { ...process.env };

const commonConfig = () =>
  new LLMConfig({
    systemMessage: 'System prompt for provider-native request payload tests.',
    temperature: 0,
    maxTokens: 128,
    extraParams: {}
  });

const model = (
  provider: LLMProvider,
  value: string,
  extra: Partial<ConstructorParameters<typeof LLMModel>[0]> = {}
) =>
  new LLMModel({
    name: value,
    value,
    canonicalName: value,
    provider,
    ...extra
  });

const callA: ToolCallSpec = {
  id: 'call_a',
  name: 'get_weather',
  arguments: { city: 'Berlin', unit: 'celsius' }
};

const callB: ToolCallSpec = {
  id: 'call_b',
  name: 'get_time',
  arguments: { city: 'Berlin' }
};

const providerCalls = (provider: 'gemini' | 'anthropic' | 'mistral' | 'ollama' | 'openai_responses'): ToolCallSpec[] => {
  switch (provider) {
    case 'gemini':
      return [
        {
          ...callA,
          nativeToolCallContext: {
            provider: 'gemini',
            modelContent: {
              role: 'model',
              parts: [
                { text: 'preserved thought', thought: true, thoughtSignature: 'thought-sig-1' },
                {
                  functionCall: {
                    id: 'call_a',
                    name: 'get_weather',
                    args: { city: 'STALE' }
                  }
                },
                {
                  functionCall: {
                    id: 'call_b',
                    name: 'get_time',
                    args: { city: 'STALE' }
                  }
                }
              ]
            }
          }
        },
        { ...callB }
      ];
    case 'anthropic':
      return [
        {
          ...callA,
          nativeToolCallContext: {
            provider: 'anthropic',
            toolUseBlock: {
              type: 'tool_use',
              id: 'call_a',
              name: 'get_weather',
              input: { city: 'STALE' },
              cache_control: { type: 'ephemeral' }
            }
          }
        },
        {
          ...callB,
          nativeToolCallContext: {
            provider: 'anthropic',
            toolUseBlock: {
              type: 'tool_use',
              id: 'call_b',
              name: 'get_time',
              input: { city: 'STALE' }
            }
          }
        }
      ];
    case 'mistral':
      return [
        {
          ...callA,
          nativeToolCallContext: {
            provider: 'mistral',
            toolCall: {
              id: 'call_a',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"city":"STALE"}' }
            }
          }
        },
        {
          ...callB,
          nativeToolCallContext: {
            provider: 'mistral',
            toolCall: {
              id: 'call_b',
              type: 'function',
              function: { name: 'get_time', arguments: '{"city":"STALE"}' }
            }
          }
        }
      ];
    case 'openai_responses':
      return [
        {
          ...callA,
          nativeToolCallContext: {
            provider: 'openai_responses',
            functionCallItem: {
              type: 'function_call',
              id: 'fc_a',
              call_id: 'call_a',
              name: 'get_weather',
              arguments: '{"city":"STALE"}',
              status: 'completed'
            },
            responseOutputItems: [
              {
                type: 'reasoning',
                id: 'rs_1',
                summary: [{ type: 'summary_text', text: 'used tools' }]
              },
              {
                type: 'function_call',
                id: 'fc_a',
                call_id: 'call_a',
                name: 'get_weather',
                arguments: '{"city":"STALE"}',
                status: 'completed'
              }
            ]
          }
        },
        {
          ...callB,
          nativeToolCallContext: {
            provider: 'openai_responses',
            functionCallItem: {
              type: 'function_call',
              id: 'fc_b',
              call_id: 'call_b',
              name: 'get_time',
              arguments: '{"city":"STALE"}',
              status: 'completed'
            }
          }
        }
      ];
    case 'ollama':
    default:
      return [{ ...callA }, { ...callB }];
  }
};

const messagesFor = (provider: Parameters<typeof providerCalls>[0]) => [
  new Message(MessageRole.SYSTEM, 'System prompt included where supported.'),
  new Message(MessageRole.USER, 'Use both tools, then continue.'),
  new Message(MessageRole.ASSISTANT, {
    content: provider === 'gemini' ? null : 'I will use tools.',
    tool_payload: new ToolCallPayload(providerCalls(provider))
  }),
  // Reverse settlement order on purpose. API payloads must replay results in assistant call order.
  new Message(MessageRole.TOOL, {
    tool_payload: new ToolResultPayload('call_b', 'get_time', { local_time: '10:00' })
  }),
  new Message(MessageRole.TOOL, {
    tool_payload: new ToolResultPayload('call_a', 'get_weather', {
      temp_c: 21,
      condition: 'clear'
    })
  })
];

const commonTools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Return weather for a city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          unit: { type: 'string' }
        },
        required: ['city']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Return local time for a city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' }
        },
        required: ['city']
      }
    }
  }
];

const geminiTools = [
  {
    name: 'get_weather',
    description: 'Return weather for a city.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        unit: { type: 'string' }
      },
      required: ['city']
    }
  }
];

const SYNTHETIC_AGGREGATE_TOOL_RESULT_PREFIX =
  'The following tool executions have completed. Please analyze their results and decide the next course of action.';

const expectNoSyntheticAggregateToolResultUserMessage = (payload: unknown) => {
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toContain(SYNTHETIC_AGGREGATE_TOOL_RESULT_PREFIX);
  expect(serialized).not.toContain('Tool: get_weather (ID: call_a)');
  expect(serialized).not.toContain('Tool: get_time (ID: call_b)');
  expect(serialized).not.toContain('Status: Success');
};

const expectNoLegacyProviderText = (payload: unknown) => {
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toContain('[TOOL_CALL]');
  expect(serialized).not.toContain('[TOOL_RESULT]');
  expect(serialized).not.toContain('[TOOL_ERROR]');
  expectNoSyntheticAggregateToolResultUserMessage(payload);
};

describe('provider-native API request payloads', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTOBYTEUS_STREAM_PARSER: 'api_tool_call',
      VERTEX_AI_API_KEY: '',
      VERTEX_AI_PROJECT: '',
      VERTEX_AI_LOCATION: '',
      GEMINI_API_KEY: 'test-gemini-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      MISTRAL_API_KEY: 'test-mistral-key',
      OPENAI_API_KEY: 'test-openai-key'
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('captures Gemini generateContent payload with native calls, ordered function responses, preserved thinking metadata, and no synthetic aggregate user text', async () => {
    let captured: any;
    const llm = new GeminiLLM(undefined, commonConfig());
    (llm as any).client = {
      models: {
        generateContent: async (params: any) => {
          captured = params;
          return {
            text: 'ok',
            candidates: [{ content: { parts: [{ text: 'ok' }] } }],
            usageMetadata: {
              promptTokenCount: 1,
              candidatesTokenCount: 1,
              totalTokenCount: 2
            }
          };
        }
      }
    };

    await llm.sendMessages(messagesFor('gemini'), null, { tools: geminiTools });

    const modelTurn = captured.contents.find((item: any) =>
      item.role === 'model' && item.parts?.some((part: any) => part.functionCall)
    );
    const resultTurn = captured.contents.find((item: any) =>
      item.role === 'user' && item.parts?.some((part: any) => part.functionResponse)
    );
    const functionCalls = modelTurn.parts
      .filter((part: any) => part.functionCall)
      .map((part: any) => part.functionCall);
    const functionResponses = resultTurn.parts
      .filter((part: any) => part.functionResponse)
      .map((part: any) => part.functionResponse);
    const syntheticAggregateUserTurns = captured.contents.filter((item: any) =>
      item.role === 'user' &&
      item.parts?.some((part: any) =>
        typeof part.text === 'string' &&
        part.text.includes(SYNTHETIC_AGGREGATE_TOOL_RESULT_PREFIX)
      )
    );

    expect(functionCalls.map((call: any) => call.id)).toEqual(['call_a', 'call_b']);
    expect(functionResponses.map((response: any) => response.id)).toEqual(['call_a', 'call_b']);
    expect(functionCalls.map((call: any) => call.args.city)).toEqual(['Berlin', 'Berlin']);
    expect(resultTurn.parts.every((part: any) => part.functionResponse)).toBe(true);
    expect(syntheticAggregateUserTurns).toEqual([]);
    expect(modelTurn.parts.some((part: any) => part.thoughtSignature === 'thought-sig-1')).toBe(true);
    expect(captured.config.tools[0].functionDeclarations[0].name).toBe('get_weather');
    expectNoLegacyProviderText(captured);
  });

  it('captures Ollama chat payload with assistant tool_calls, ordered role=tool results, and no synthetic aggregate user text', async () => {
    let captured: any;
    const llm = new OllamaLLM(
      model(LLMProvider.OLLAMA, 'llama3.1', { hostUrl: 'http://127.0.0.1:11434' }),
      commonConfig()
    );
    (llm as any).client = {
      chat: async (request: any) => {
        captured = request;
        return {
          message: { content: 'ok' },
          prompt_eval_count: 1,
          eval_count: 1
        };
      }
    };

    await llm.sendMessages(messagesFor('ollama'), null, { tools: commonTools });

    const assistant = captured.messages.find((msg: any) => Array.isArray(msg.tool_calls));
    const toolMessages = captured.messages.filter((msg: any) => msg.role === 'tool');
    const userMessages = captured.messages.filter((msg: any) => msg.role === 'user');
    expect(assistant.tool_calls.map((call: any) => call.function.name)).toEqual([
      'get_weather',
      'get_time'
    ]);
    expect(toolMessages.map((msg: any) => msg.tool_name)).toEqual(['get_weather', 'get_time']);
    expect(toolMessages.every((msg: any) => typeof msg.content === 'string')).toBe(true);
    expect(userMessages.map((msg: any) => msg.content)).toEqual(['Use both tools, then continue.']);
    expect(captured.tools).toHaveLength(2);
    expectNoLegacyProviderText(captured);
  });

  it('captures Anthropic messages payload with strict assistant tool_use followed by result-block-first user tool_result blocks and no synthetic aggregate user text', async () => {
    let captured: any;
    const llm = new AnthropicLLM(model(LLMProvider.ANTHROPIC, 'claude-sonnet-4-5'), commonConfig());
    (llm as any).client = {
      messages: {
        create: async (params: any) => {
          captured = params;
          return {
            content: [{ type: 'text', text: 'ok' }],
            usage: { input_tokens: 1, output_tokens: 1 }
          };
        }
      }
    };

    await llm.sendMessages(messagesFor('anthropic'), null, { tools: commonTools });

    const assistantIndex = captured.messages.findIndex((msg: any) =>
      msg.role === 'assistant' &&
      Array.isArray(msg.content) &&
      msg.content.some((block: any) => block.type === 'tool_use')
    );
    const assistant = captured.messages[assistantIndex];
    const next = captured.messages[assistantIndex + 1];
    const toolUseBlocks = assistant.content.filter((block: any) => block.type === 'tool_use');
    const resultBlocks = next.content.filter((block: any) => block.type === 'tool_result');

    expect(toolUseBlocks.map((block: any) => block.id)).toEqual(['call_a', 'call_b']);
    expect(toolUseBlocks[0].input.city).toBe('Berlin');
    expect(next.role).toBe('user');
    expect(next.content[0].type).toBe('tool_result');
    expect(next.content[1].type).toBe('tool_result');
    expect(next.content.slice(0, resultBlocks.length).every((block: any) => block.type === 'tool_result')).toBe(true);
    expect(resultBlocks.map((block: any) => block.tool_use_id)).toEqual(['call_a', 'call_b']);
    expectNoLegacyProviderText(captured);
  });

  it('captures Mistral chat payload with native tool_calls, ordered role=tool results, and no synthetic aggregate user text', async () => {
    let captured: any;
    const llm = new MistralLLM(model(LLMProvider.MISTRAL, 'mistral-large-2512'), commonConfig());
    (llm as any).client = {
      chat: {
        complete: async (params: any) => {
          captured = params;
          return {
            choices: [{ message: { content: 'ok' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
          };
        }
      }
    };

    await llm.sendMessages(messagesFor('mistral'), null, { tools: commonTools });

    const assistant = captured.messages.find((msg: any) => Array.isArray(msg.tool_calls));
    const toolMessages = captured.messages.filter((msg: any) => msg.role === 'tool');
    const userMessages = captured.messages.filter((msg: any) => msg.role === 'user');
    expect(assistant.tool_calls.map((call: any) => call.id)).toEqual(['call_a', 'call_b']);
    expect(JSON.parse(assistant.tool_calls[0].function.arguments).city).toBe('Berlin');
    expect(toolMessages.map((msg: any) => msg.tool_call_id)).toEqual(['call_a', 'call_b']);
    expect(toolMessages.map((msg: any) => msg.name)).toEqual(['get_weather', 'get_time']);
    expect(userMessages.map((msg: any) => msg.content)).toEqual(['Use both tools, then continue.']);
    expectNoLegacyProviderText(captured);
  });

  it('captures OpenAI Responses payload with function_call/function_call_output item retention, call_id matching, and no synthetic aggregate user text', async () => {
    let captured: any;
    const llm = new OpenAIResponsesLLM(
      model(LLMProvider.OPENAI, 'gpt-5.1'),
      'OPENAI_API_KEY',
      'https://api.openai.com/v1',
      commonConfig(),
      'test-openai-key'
    );
    (llm as any).client = {
      responses: {
        create: async (params: any) => {
          captured = params;
          return {
            output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }],
            usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }
          };
        }
      }
    };

    await llm.sendMessages(messagesFor('openai_responses'), null, {
      tools: commonTools,
      tool_choice: 'auto'
    });

    const functionCalls = captured.input.filter((item: any) => item.type === 'function_call');
    const outputs = captured.input.filter((item: any) => item.type === 'function_call_output');
    const userMessages = captured.input.filter((item: any) =>
      item.type === 'message' && item.role === 'user'
    );
    expect(functionCalls.map((item: any) => item.call_id)).toEqual(['call_a', 'call_b']);
    expect(functionCalls.map((item: any) => item.id)).toEqual(['fc_a', 'fc_b']);
    expect(JSON.parse(functionCalls[0].arguments).city).toBe('Berlin');
    expect(outputs.map((item: any) => item.call_id)).toEqual(['call_a', 'call_b']);
    expect(userMessages.map((item: any) => item.content)).toEqual(['Use both tools, then continue.']);
    expect(captured.tools[0]).toMatchObject({ type: 'function', name: 'get_weather' });
    expectNoLegacyProviderText(captured);
  });
});
