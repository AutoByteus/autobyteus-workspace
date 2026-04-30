import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMUserMessageReadyEventHandler } from '../../../../src/agent/handlers/llm-user-message-ready-event-handler.js';
import {
  LLMCompleteResponseReceivedEvent,
  LLMUserMessageReadyEvent
} from '../../../../src/agent/events/agent-events.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { ToolSchemaProvider } from '../../../../src/tools/usage/providers/tool-schema-provider.js';
import type { ChunkResponse as ChunkResponseType } from '../../../../src/llm/utils/response-types.js';
import { MessageRole, ToolCallPayload } from '../../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { MemoryStore } from '../../../../src/memory/store/base-store.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { PendingCompactionExecutor } from '../../../../src/memory/compaction/pending-compaction-executor.js';
import { CompactionPreparationError } from '../../../../src/agent/compaction/compaction-preparation-error.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: any[]
  ): AsyncGenerator<ChunkResponseType, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

class InMemoryStore extends MemoryStore {
  private items: any[] = [];

  add(items: Iterable<any>): void {
    for (const item of items) {
      this.items.push(item);
    }
  }

  list(memoryType: MemoryType, limit?: number): any[] {
    const filtered = this.items.filter((item) => item?.memoryType === memoryType);
    if (typeof limit === 'number') {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  listRawTracesOrdered(limit?: number): any[] {
    return this.list(MemoryType.RAW_TRACE, limit);
  }

  pruneRawTracesById(traceIdsToRemove: Iterable<string>): void {
    const ids = new Set(Array.from(traceIdsToRemove));
    this.items = this.items.filter((item) => item?.memoryType !== MemoryType.RAW_TRACE || !ids.has(item.id));
  }
}

const makeContext = (provider: LLMProvider, toolNames: string[] = []) => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const config = new AgentConfig('name', 'role', 'desc', llm);
  const state = new AgentRuntimeState('agent-1');
  const inputQueues = {
    enqueueInternalSystemEvent: vi.fn(async () => undefined),
    enqueueToolInvocationRequest: vi.fn(async () => undefined)
  } as any;
  const notifier = {
    notifyAgentSegmentEvent: vi.fn(),
    notifyAgentErrorOutputGeneration: vi.fn(),
    notifyAgentTurnStarted: vi.fn(),
    notifyAgentCompactionStatus: vi.fn()
  };

  state.llmInstance = llm;
  state.inputEventQueues = inputQueues;
  state.statusManagerRef = { notifier } as any;
  state.memoryManager = new MemoryManager({ store: new InMemoryStore() });
  state.startActiveTurn('turn-1');
  state.toolInstances = toolNames.reduce((acc, name) => {
    acc[name] = { getName: () => name };
    return acc;
  }, {} as Record<string, any>);
  config.tools = toolNames.map((name) => ({ getName: () => name } as any));

  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues, notifier };
};

const originalEnv = { ...process.env };

describe('LLMUserMessageReadyEventHandler', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('uses streaming parser to buffer partial XML tags', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    const handler = new LLMUserMessageReadyEventHandler();
    const { context, inputQueues, notifier } = makeContext(LLMProvider.ANTHROPIC, ['search']);

    const chunks = [
      new ChunkResponse({ content: 'Hello ' }),
      new ChunkResponse({ content: '<wr' }),
      new ChunkResponse({ content: 'ite_file path="x">' }),
      new ChunkResponse({ content: 'World' }),
      new ChunkResponse({ content: '</wr' }),
      new ChunkResponse({ content: 'ite_file>', is_complete: true })
    ];

    const mockLLM = {
      model: { provider: LLMProvider.ANTHROPIC },
      config: { systemMessage: 'system' },
      streamMessages: async function* (_messages: any[], _rendered: unknown, _kwargs: Record<string, any>) {
        for (const chunk of chunks) {
          yield chunk;
        }
      }
    };
    context.state.llmInstance = mockLLM as any;

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');
    await handler.handle(event, context);

    const deltas = notifier.notifyAgentSegmentEvent.mock.calls
      .map(([payload]) => payload)
      .filter((payload) => payload?.type === 'SEGMENT_CONTENT')
      .map((payload) => payload.payload?.delta)
      .filter((delta) => typeof delta === 'string');
    const combined = deltas.join('');

    expect(combined).toContain('Hello ');
    expect(combined).toContain('World');
    expect(combined).not.toContain('<wr');
    expect(notifier.notifyAgentSegmentEvent).toHaveBeenCalled();
    const firstSegmentPayload = notifier.notifyAgentSegmentEvent.mock.calls[0][0];
    expect(typeof firstSegmentPayload.turn_id).toBe('string');
    expect(firstSegmentPayload.turn_id).not.toBeNull();
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledOnce();
    const completionEvent = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(completionEvent).toBeInstanceOf(LLMCompleteResponseReceivedEvent);
    expect(typeof completionEvent.turnId).toBe('string');
    expect(completionEvent.turnId).not.toBeNull();
  });

  it('uses provider-aware JSON parsing for tool invocations', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'json';
    const handler = new LLMUserMessageReadyEventHandler();
    const { context, inputQueues } = makeContext(LLMProvider.GEMINI, ['search']);

    const jsonPayload =
      '{"tool": {"function": {"name": "search"}, "arguments": {"query": "autobyteus"}}}';

    const mockLLM = {
      model: { provider: LLMProvider.GEMINI },
      config: { systemMessage: 'system' },
      streamMessages: async function* (_messages: any[], _rendered: unknown, _kwargs: Record<string, any>) {
        yield new ChunkResponse({ content: jsonPayload, is_complete: true });
      }
    };
    context.state.llmInstance = mockLLM as any;

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');
    await handler.handle(event, context);

    expect(inputQueues.enqueueToolInvocationRequest).toHaveBeenCalled();
    const invocationEvent = inputQueues.enqueueToolInvocationRequest.mock.calls[0][0];
    expect(invocationEvent.toolInvocation.name).toBe('search');
    expect(invocationEvent.toolInvocation.arguments).toEqual({ query: 'autobyteus' });
  });

  it('uses pass-through handler when no tools are configured', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    const handler = new LLMUserMessageReadyEventHandler();
    const { context, inputQueues, notifier } = makeContext(LLMProvider.OPENAI, []);

    const mockLLM = {
      model: { provider: LLMProvider.OPENAI },
      config: { systemMessage: 'system' },
      streamMessages: async function* (_messages: any[], _rendered: unknown, _kwargs: Record<string, any>) {
        yield new ChunkResponse({ content: '<write_file>', is_complete: true });
      }
    };
    context.state.llmInstance = mockLLM as any;

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');
    await handler.handle(event, context);

    const deltas = notifier.notifyAgentSegmentEvent.mock.calls
      .map(([payload]) => payload)
      .filter((payload) => payload?.type === 'SEGMENT_CONTENT')
      .map((payload) => payload.payload?.delta)
      .filter((delta) => typeof delta === 'string');
    const combined = deltas.join('');

    expect(combined).toContain('<write_file>');
    expect(inputQueues.enqueueToolInvocationRequest).not.toHaveBeenCalled();
  });

  it('passes tool schemas to LLM stream for api_tool_call mode', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new LLMUserMessageReadyEventHandler();
    const { context } = makeContext(LLMProvider.OPENAI, ['mock_tool']);

    const toolsSchema = [
      {
        type: 'function',
        function: {
          name: 'mock_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: { arg: { type: 'string' } },
            required: []
          }
        }
      }
    ];

    const schemaSpy = vi.spyOn(ToolSchemaProvider.prototype, 'buildSchema').mockReturnValue(toolsSchema);

    const kwargsPassed: { value: any } = { value: null };
    const mockLLM = {
      model: { provider: LLMProvider.OPENAI },
      config: { systemMessage: 'system' },
      streamMessages: async function* (_messages: any[], _rendered: unknown, kwargs: Record<string, any>) {
        kwargsPassed.value = kwargs;
        yield new ChunkResponse({ content: 'Hello', is_complete: true });
      }
    };
    context.state.llmInstance = mockLLM as any;

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');
    await handler.handle(event, context);

    expect(schemaSpy).toHaveBeenCalledOnce();
    expect(kwargsPassed.value.tools).toEqual(toolsSchema);
    expect(kwargsPassed.value.logicalConversationId).toBe('agent-1');
  });

  it('propagates active turn id on error completion events', async () => {
    const handler = new LLMUserMessageReadyEventHandler();
    const { context, inputQueues } = makeContext(LLMProvider.OPENAI, []);

    const mockLLM = {
      model: { provider: LLMProvider.OPENAI },
      config: { systemMessage: 'system' },
      streamMessages: async function* () {
        throw new Error('simulated stream failure');
      }
    };
    context.state.llmInstance = mockLLM as any;

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');
    await handler.handle(event, context);

    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledOnce();
    const completionEvent = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(completionEvent).toBeInstanceOf(LLMCompleteResponseReceivedEvent);
    expect(completionEvent.isError).toBe(true);
    expect(typeof completionEvent.turnId).toBe('string');
    expect(completionEvent.turnId).not.toBeNull();
  });


  it('converts compaction preparation failures into an error completion event', async () => {
    const handler = new LLMUserMessageReadyEventHandler();
    const { context, inputQueues, notifier } = makeContext(LLMProvider.OPENAI, []);
    const executeIfRequiredSpy = vi
      .spyOn(PendingCompactionExecutor.prototype, 'executeIfRequired')
      .mockRejectedValueOnce(
        new CompactionPreparationError(
          'Memory compaction failed before dispatch: compaction blew up',
          new Error('compaction blew up')
        )
      );

    const streamMessages = vi.fn(async function* () {
      yield new ChunkResponse({ content: 'should not stream', is_complete: true });
    });
    context.state.llmInstance = {
      ...context.state.llmInstance,
      model: { provider: LLMProvider.OPENAI, modelIdentifier: 'main-model' },
      config: { systemMessage: 'system', maxTokens: 32 },
      streamMessages,
    } as any;

    context.state.memoryManager!.requestCompaction();

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');
    await handler.handle(event, context);

    expect(executeIfRequiredSpy).toHaveBeenCalledOnce();
    expect(streamMessages).not.toHaveBeenCalled();
    expect(notifier.notifyAgentErrorOutputGeneration).toHaveBeenCalledWith(
      'LLMUserMessageReadyEventHandler.prepareRequest',
      expect.stringContaining('Memory compaction failed before dispatch'),
      expect.stringContaining('compaction blew up')
    );
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledOnce();
    const completionEvent = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(completionEvent).toBeInstanceOf(LLMCompleteResponseReceivedEvent);
    expect(completionEvent.isError).toBe(true);
    expect(context.state.memoryManager?.compactionRequired).toBe(true);
  });

  it('rejects mismatched turn ownership on the continuation event', async () => {
    const handler = new LLMUserMessageReadyEventHandler();
    const { context, inputQueues, notifier } = makeContext(LLMProvider.OPENAI, []);
    context.state.activeTurn = context.state.startActiveTurn('different-turn');

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');

    await expect(handler.handle(event, context)).rejects.toThrow(
      "received LLMUserMessageReadyEvent for turn 'turn-1', but activeTurn is 'different-turn'"
    );

    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
    expect(notifier.notifyAgentTurnStarted).toHaveBeenCalledTimes(2);
  });

  it('does not append assistant text to working context when tool calls are emitted', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new LLMUserMessageReadyEventHandler();
    const { context, inputQueues } = makeContext(LLMProvider.DEEPSEEK, ['search']);

    const mockLLM = {
      model: { provider: LLMProvider.DEEPSEEK },
      config: { systemMessage: 'system' },
      streamMessages: async function* () {
        yield new ChunkResponse({
          content: 'I will call a tool now.',
          tool_calls: [
            { index: 0, call_id: 'call_1', name: 'search', arguments_delta: '{"query":"autobyteus"}' }
          ]
        });
        yield new ChunkResponse({ content: '', is_complete: true });
      }
    };
    context.state.llmInstance = mockLLM as any;

    const event = new LLMUserMessageReadyEvent(new LLMUserMessage({ content: 'prompt' }), 'turn-1');
    await handler.handle(event, context);

    expect(inputQueues.enqueueToolInvocationRequest).toHaveBeenCalledOnce();

    const messages = context.state.memoryManager?.getWorkingContextMessages() ?? [];
    const assistantMessages = messages.filter((message) => message.role === MessageRole.ASSISTANT);
    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0].content).toBeNull();
    expect(assistantMessages[0].tool_payload).toBeInstanceOf(ToolCallPayload);
  });
});
