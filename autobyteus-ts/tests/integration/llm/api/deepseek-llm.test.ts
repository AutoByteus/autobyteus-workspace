import { describe, it, expect } from 'vitest';
import { DeepSeekLLM } from '../../../../src/llm/api/deepseek-llm.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../../src/llm/utils/messages.js';
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
      required: ['number']
    }
  }
};

const runToolCallContinuation = async (llm: DeepSeekLLM): Promise<void> => {
  const toolPromptMessages = [
    new Message(MessageRole.SYSTEM, { content: 'You are a tool-using assistant.' }),
    new Message(MessageRole.USER, {
      content: 'Call echo_number with number 42, then wait for tool results.'
    })
  ];
  const parser = new ApiToolCallStreamingResponseHandler({ turnId: TURN_ID });
  for await (const chunk of llm.streamMessages(toolPromptMessages, null, {
    tools: [TOOL_SCHEMA],
    tool_choice: 'required'
  })) {
    parser.feed(chunk);
  }
  parser.finalize();

  const invocations = parser.getAllInvocations();
  expect(invocations.length).toBeGreaterThan(0);

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

  it('should support tool-call continuation without strict ordering errors', async () => {
    const llm = new DeepSeekLLM(buildModel());
    try {
      await runToolCallContinuation(llm);
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
