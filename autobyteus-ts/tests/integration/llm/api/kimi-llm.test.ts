import { describe, it, expect } from 'vitest';
import { KimiLLM } from '../../../../src/llm/api/kimi-llm.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../../src/llm/utils/messages.js';
import { skipIfProviderAccessError } from '../../helpers/provider-access.js';

const apiKey = process.env.KIMI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const TURN_ID = 'turn_test';

const buildModel = () =>
  new LLMModel({
    name: 'kimi-k2.6',
    value: 'kimi-k2.6',
    canonicalName: 'kimi-k2.6',
    provider: LLMProvider.KIMI
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

const runToolCallContinuation = async (llm: KimiLLM): Promise<void> => {
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

runIntegration('KimiLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new KimiLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: "Hello, Kimi LLM! Please respond with 'pong'." });

    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('pong');
      expect(response.usage).toBeTruthy();
    } catch (error) {
      if (skipIfProviderAccessError('Kimi', 'kimi-k2.6', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async () => {
    const llm = new KimiLLM(buildModel());
    const userMessage = new LLMUserMessage({ content: 'Please write a short two-sentence greeting.' });
    const receivedTokens: string[] = [];
    let completeResponse = '';

    try {
      for await (const chunk of (llm as any)._streamUserMessageToLLM(userMessage, {})) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }

        if (chunk.is_complete) {
          expect(chunk.usage).toBeTruthy();
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(1);
      expect(completeResponse.length).toBeGreaterThan(10);
    } catch (error) {
      if (skipIfProviderAccessError('Kimi', 'kimi-k2.6', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public sendUserMessage', async () => {
    const llm = new KimiLLM(buildModel());
    const userMessageText = 'Who developed the programming language Python?';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('guido van rossum');
    } catch (error) {
      if (skipIfProviderAccessError('Kimi', 'kimi-k2.6', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public streamUserMessage', async () => {
    const llm = new KimiLLM(buildModel());
    const userMessageText = 'Please list three popular web frameworks for Python.';
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

      expect(receivedTokens.length).toBeGreaterThan(1);
      expect(completeResponse.toLowerCase()).toContain('django');
      expect(completeResponse.toLowerCase()).toContain('flask');
    } catch (error) {
      if (skipIfProviderAccessError('Kimi', 'kimi-k2.6', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support tool-call continuation without strict ordering errors', async () => {
    const llm = new KimiLLM(buildModel());
    try {
      await runToolCallContinuation(llm);
    } catch (error) {
      if (skipIfProviderAccessError('Kimi', 'kimi-k2.6', error)) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
