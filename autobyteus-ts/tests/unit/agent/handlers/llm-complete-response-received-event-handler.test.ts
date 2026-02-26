import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMCompleteResponseReceivedEventHandler } from '../../../../src/agent/handlers/llm-complete-response-received-event-handler.js';
import {
  LLMCompleteResponseReceivedEvent,
  PendingToolInvocationEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { BaseLLMResponseProcessor } from '../../../../src/agent/llm-response-processor/base-processor.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const makeContext = () => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const config = new AgentConfig('name', 'role', 'desc', llm);
  const state = new AgentRuntimeState('agent-1');
  const inputQueues = { enqueueToolInvocationRequest: vi.fn(async () => undefined) } as any;
  state.inputEventQueues = inputQueues;
  const notifier = {
    notifyAgentDataAssistantCompleteResponse: vi.fn(),
    notifyAgentErrorOutputGeneration: vi.fn()
  };
  state.statusManagerRef = { notifier } as any;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues, notifier };
};

class MockLLMResponseProcessor extends BaseLLMResponseProcessor {
  private shouldHandle = false;
  processedText: string | null = null;

  static getName(): string {
    return 'mock_processor';
  }

  static getOrder(): number {
    return 100;
  }

  setShouldHandle(value: boolean) {
    this.shouldHandle = value;
  }

  async processResponse(
    response: CompleteResponse,
    context: AgentContext,
    _triggeringEvent: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    this.processedText = response.content;
    if (this.shouldHandle) {
      const mockInvocation = new ToolInvocation('processed_tool', {}, 'test-tool-id');
      await (context.inputEventQueues as any).enqueueToolInvocationRequest(
        new PendingToolInvocationEvent(mockInvocation)
      );
      return true;
    }
    return false;
  }

  reset() {
    this.shouldHandle = false;
    this.processedText = null;
  }
}

describe('LLMCompleteResponseReceivedEventHandler', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    debugSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('handles response processed by a processor', async () => {
    const handler = new LLMCompleteResponseReceivedEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const processor = new MockLLMResponseProcessor();
    processor.setShouldHandle(true);
    context.config.llmResponseProcessors = [processor];

    const responseText = 'LLM response with tool call <tool>...';
    const usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 };
    const completeResponse = new CompleteResponse({ content: responseText, usage });
    const event = new LLMCompleteResponseReceivedEvent(completeResponse);

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          `Response Length: ${responseText.length}, Reasoning Length: 0, IsErrorFlagged: false, TokenUsage: ${usage}`
        )
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("LLMResponseProcessor 'mock_processor' handled the response.")
      )
    ).toBe(true);
    expect(processor.processedText).toBe(responseText);
    expect(notifier.notifyAgentDataAssistantCompleteResponse).toHaveBeenCalledTimes(1);

    expect(inputQueues.enqueueToolInvocationRequest).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueToolInvocationRequest.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(PendingToolInvocationEvent);
    expect(enqueued.toolInvocation.name).toBe('processed_tool');
  });

  it('handles response not processed by any processor', async () => {
    const handler = new LLMCompleteResponseReceivedEventHandler();
    const { context, notifier } = makeContext();
    const processor = new MockLLMResponseProcessor();
    processor.setShouldHandle(false);
    context.config.llmResponseProcessors = [processor];

    const responseText = 'Final LLM answer, no tools.';
    const completeResponse = new CompleteResponse({ content: responseText });
    const event = new LLMCompleteResponseReceivedEvent(completeResponse);

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('No LLMResponseProcessor handled the response')
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('Emitting the full LLM response as a final answer')
      )
    ).toBe(true);
    expect(processor.processedText).toBe(responseText);
    expect(notifier.notifyAgentDataAssistantCompleteResponse).toHaveBeenCalledWith(
      completeResponse
    );
  });

  it('skips processors for error responses', async () => {
    const handler = new LLMCompleteResponseReceivedEventHandler();
    const { context, notifier } = makeContext();
    const processor = new MockLLMResponseProcessor();
    processor.setShouldHandle(false);
    context.config.llmResponseProcessors = [processor];

    const completeResponse = new CompleteResponse({ content: 'An error occurred in a previous stage.' });
    const event = new LLMCompleteResponseReceivedEvent(completeResponse, true);

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('LLMCompleteResponseReceivedEvent was marked as an error response')
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) => String(msg).includes('Skipping LLMResponseProcessor attempts'))
    ).toBe(true);
    expect(processor.processedText).toBeNull();
    expect(notifier.notifyAgentDataAssistantCompleteResponse).toHaveBeenCalledWith(
      completeResponse
    );
  });

  it('handles no processors configured', async () => {
    const handler = new LLMCompleteResponseReceivedEventHandler();
    const { context, notifier } = makeContext();
    context.config.llmResponseProcessors = [];

    const completeResponse = new CompleteResponse({ content: 'Response when no processors are configured.' });
    const event = new LLMCompleteResponseReceivedEvent(completeResponse);

    await handler.handle(event, context);

    expect(
      debugSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('No LLM response processors configured in agent config')
      )
    ).toBe(true);
    expect(notifier.notifyAgentDataAssistantCompleteResponse).toHaveBeenCalledTimes(1);
  });

  it('skips invalid processors and still emits response', async () => {
    const handler = new LLMCompleteResponseReceivedEventHandler();
    const { context, notifier } = makeContext();
    class NotAProcessor {}
    context.config.llmResponseProcessors = [new NotAProcessor() as any];

    const completeResponse = new CompleteResponse({ content: 'Response with invalid processor.' });
    const event = new LLMCompleteResponseReceivedEvent(completeResponse);

    await handler.handle(event, context);

    expect(
      errorSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('Invalid LLM response processor type in config')
      )
    ).toBe(true);
    expect(notifier.notifyAgentDataAssistantCompleteResponse).toHaveBeenCalledTimes(1);
  });

  it('notifies when processor throws', async () => {
    const handler = new LLMCompleteResponseReceivedEventHandler();
    const { context, notifier } = makeContext();
    const processor = new MockLLMResponseProcessor();
    processor.processResponse = vi.fn(async () => {
      throw new Error('Simulated processor error');
    });
    context.config.llmResponseProcessors = [processor as any];

    const completeResponse = new CompleteResponse({ content: 'Response that causes processor error.' });
    const event = new LLMCompleteResponseReceivedEvent(completeResponse);

    await handler.handle(event, context);

    expect(
      errorSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Error while using LLMResponseProcessor 'mock_processor': Error: Simulated processor error")
      )
    ).toBe(true);
    expect(notifier.notifyAgentDataAssistantCompleteResponse).toHaveBeenCalledTimes(1);
    expect(notifier.notifyAgentErrorOutputGeneration).toHaveBeenCalledWith(
      'LLMResponseProcessor.mock_processor',
      'Error: Simulated processor error'
    );
  });

  it('logs initialization', () => {
    new LLMCompleteResponseReceivedEventHandler();
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('LLMCompleteResponseReceivedEventHandler initialized.')
      )
    ).toBe(true);
  });
});
