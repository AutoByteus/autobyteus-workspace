import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../../src/agent/llm-request-assembler.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { DeepSeekLLM } from '../../../../src/llm/api/deepseek-llm.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { skipIfProviderAccessError } from '../../helpers/provider-access.js';

const apiKey = process.env.DEEPSEEK_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const TURN_ID = 'turn_test';

const buildModel = () =>
  new LLMModel({
    name: 'deepseek-v4-flash',
    value: 'deepseek-v4-flash',
    canonicalName: 'deepseek-v4-flash',
    provider: LLMProvider.DEEPSEEK
  });

const buildThinkingModel = () =>
  new LLMModel({
    name: 'deepseek-v4-pro',
    value: 'deepseek-v4-pro',
    canonicalName: 'deepseek-v4-pro',
    provider: LLMProvider.DEEPSEEK
  });

const TOOL_SCHEMA = {
  type: 'function',
  function: {
    name: 'echo_number',
    description: 'Returns the provided number',
    parameters: {
      type: 'object',
      properties: {
        number: { type: 'number' }
      },
      required: ['number'],
      additionalProperties: false
    }
  }
};

const WEATHER_TOOL_SCHEMA = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Returns a deterministic weather summary for the requested location and date',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        date: { type: 'string' }
      },
      required: ['location', 'date'],
      additionalProperties: false
    }
  }
};

const runOptionalToolCallContinuation = async (llm: DeepSeekLLM): Promise<void> => {
  const toolPromptMessages = [
    new Message(MessageRole.SYSTEM, { content: 'You are a tool-using assistant.' }),
    new Message(MessageRole.USER, {
      content: 'Use echo_number with number 42 if a tool call is needed; otherwise explain why no tool is needed.'
    })
  ];
  const parser = new ApiToolCallStreamingResponseHandler({ turnId: TURN_ID });
  let assistantText = '';
  for await (const chunk of llm.streamMessages(toolPromptMessages, null, {
    tools: [TOOL_SCHEMA]
  })) {
    assistantText += chunk.content ?? '';
    parser.feed(chunk);
  }
  parser.finalize();

  const invocations = parser.getAllInvocations();
  if (!invocations.length) {
    expect(assistantText.trim().length).toBeGreaterThan(0);
    return;
  }

  const continuationMessages = [
    ...toolPromptMessages,
    new Message(MessageRole.ASSISTANT, {
      content: null,
      tool_payload: new ToolCallPayload(
        invocations.map((invocation) => ({
          id: invocation.id,
          name: invocation.name,
          arguments: invocation.arguments
        }))
      )
    }),
    ...invocations.map(
      (invocation) =>
        new Message(MessageRole.TOOL, {
          content: null,
          tool_payload: new ToolResultPayload(invocation.id, invocation.name, { number: 42, ok: true })
        })
    ),
    new Message(MessageRole.USER, {
      content: 'All tool results are available. Provide one short final sentence.'
    })
  ];

  const continuationResponse = await llm.sendMessages(continuationMessages);
  expect(typeof continuationResponse.content).toBe('string');
  expect((continuationResponse.content ?? '').trim().length).toBeGreaterThan(0);
};

describe('DeepSeekLLM reasoning continuation payloads', () => {
  it('sends memory-preserved reasoning_content on assistant tool-call messages through the configured DeepSeekLLM path', async () => {
    const originalApiKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = 'sk-test-deepseek';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-reasoning-continuation-'));
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'The forecast is sunny.',
            reasoning_content: 'The tool result contains the forecast.'
          }
        }
      ]
    });
    let llm: DeepSeekLLM | null = null;

    try {
      llm = new DeepSeekLLM(buildThinkingModel());
      (llm as any).client = {
        chat: {
          completions: {
            create: createMock
          }
        }
      };

      const manager = new MemoryManager({
        store: new FileMemoryStore(tempDir, 'agent_deepseek_reasoning_continuation')
      });
      const turnId = manager.startTurn();
      manager.workingContextSnapshot.appendUser('How is the weather in Hangzhou tomorrow?');

      const invocation = new ToolInvocation(
        'get_weather',
        { location: 'Hangzhou', date: 'tomorrow' },
        'call_weather_1',
        turnId
      );
      manager.ingestToolIntents([invocation], turnId, {
        assistantContent: 'I will look up the weather first.',
        assistantReasoning: 'The user asks for current weather data, so I need the weather tool.'
      });
      manager.ingestToolResult(
        new ToolResultEvent(
          'get_weather',
          { location: 'Hangzhou', date: 'tomorrow', forecast: 'sunny' },
          'call_weather_1',
          undefined,
          { location: 'Hangzhou', date: 'tomorrow' },
          turnId
        ),
        turnId
      );

      const assembler = new LLMRequestAssembler(manager, (llm as any)._renderer);
      const request = await assembler.prepareToolContinuationRequest(turnId);

      await llm.sendMessages(request.messages, request.renderedPayload, {
        tools: [WEATHER_TOOL_SCHEMA],
        reasoning_effort: 'high',
        extra_body: { thinking: { type: 'enabled' } }
      });

      expect(createMock).toHaveBeenCalledTimes(1);
      const [params] = createMock.mock.calls[0] ?? [];
      expect(params.model).toBe('deepseek-v4-pro');
      expect(params.reasoning_effort).toBe('high');
      expect(params.extra_body).toEqual({ thinking: { type: 'enabled' } });
      expect(params.tools).toEqual([WEATHER_TOOL_SCHEMA]);
      expect(params).not.toHaveProperty('tool_choice');
      expect(params.messages).toHaveLength(3);
      expect(params.messages[0]).toMatchObject({
        role: 'user',
        content: 'How is the weather in Hangzhou tomorrow?'
      });
      expect(params.messages[1]).toMatchObject({
        role: 'assistant',
        content: 'I will look up the weather first.',
        reasoning_content: 'The user asks for current weather data, so I need the weather tool.',
        tool_calls: [
          {
            id: 'call_weather_1',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: JSON.stringify({ location: 'Hangzhou', date: 'tomorrow' })
            }
          }
        ]
      });
      expect(params.messages[2]).toMatchObject({
        role: 'tool',
        tool_call_id: 'call_weather_1',
        content: JSON.stringify({ location: 'Hangzhou', date: 'tomorrow', forecast: 'sunny' })
      });
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = originalApiKey;
      }
      await llm?.cleanup();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

runIntegration('DeepSeekLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new DeepSeekLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: 'Hello, DeepSeek LLM!' });

    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error) {
      if (skipIfProviderAccessError('DeepSeek', 'deepseek-v4-flash', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async () => {
    const llm = new DeepSeekLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: 'Please write a short greeting.' });
    const receivedTokens: string[] = [];
    let completeResponse = '';

    try {
      for await (const chunk of (llm as any)._streamUserMessageToLLM(userMessage, {})) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(0);
      expect(completeResponse.length).toBeGreaterThan(0);
    } catch (error) {
      if (skipIfProviderAccessError('DeepSeek', 'deepseek-v4-flash', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public sendUserMessage', async () => {
    const llm = new DeepSeekLLM(buildModel());
    const userMessageText = 'Can you summarize the following text: The quick brown fox jumps over the lazy dog.';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error) {
      if (skipIfProviderAccessError('DeepSeek', 'deepseek-v4-flash', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public streamUserMessage', async () => {
    const llm = new DeepSeekLLM(buildModel());
    const userMessageText = 'Please list three benefits of using Python.';
    const userMessage = new LLMUserMessage({ content: userMessageText });
    const receivedTokens: string[] = [];
    let completeResponse = '';

    try {
      for await (const chunk of llm.streamUserMessage(userMessage)) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(0);
      expect(completeResponse.length).toBeGreaterThan(0);
    } catch (error) {
      if (skipIfProviderAccessError('DeepSeek', 'deepseek-v4-flash', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should accept tools without forced tool_choice and continue if the model chooses a tool call', async () => {
    const llm = new DeepSeekLLM(buildModel());
    try {
      await runOptionalToolCallContinuation(llm);
    } catch (error) {
      if (skipIfProviderAccessError('DeepSeek', 'deepseek-v4-flash', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
