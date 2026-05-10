import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import {
  GenericEvent,
  ToolContinuationReadyEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolResultEventHandler } from '../../../../src/agent/handlers/tool-result-event-handler.js';
import { MemoryIngestToolResultProcessor } from '../../../../src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { MessageRole } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { OpenAIChatRenderer } from '../../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { formatToCleanString } from '../../../../src/utils/llm-output-formatter.js';

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
  const inputQueues = {
    enqueueUserMessage: vi.fn(async () => undefined),
    enqueueToolContinuationInput: vi.fn(async () => undefined)
  } as any;
  state.inputEventQueues = inputQueues;
  const notifier = {
    notifyAgentDataToolLog: vi.fn(),
    notifyAgentToolExecutionSucceeded: vi.fn(),
    notifyAgentToolExecutionFailed: vi.fn()
  };
  state.statusManagerRef = { notifier } as any;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues, notifier };
};

const makeNativeMemoryContext = (
  invocationSpecs: Array<{ name: string; id: string }> = [{ name: 'tool_A', id: 'call_A' }]
) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-result-handler-'));
  const { context, inputQueues, notifier } = makeContext();
  const memoryManager = new MemoryManager({
    store: new FileMemoryStore(tempDir, 'agent-1')
  });
  context.state.memoryManager = memoryManager;
  context.config.toolExecutionResultProcessors = [new MemoryIngestToolResultProcessor()];

  const turn = new AgentTurn('turn_0001');
  const invocations = invocationSpecs.map(
    ({ name, id }) => new ToolInvocation(name, {}, id)
  );
  turn.startToolInvocationBatch(invocations);
  context.state.activeTurn = turn;
  memoryManager.ingestToolIntents(invocations, 'turn_0001');

  return { context, inputQueues, notifier, memoryManager, tempDir };
};

const listRawToolResults = (memoryManager: MemoryManager) =>
  memoryManager.store
    .list(MemoryType.RAW_TRACE)
    .filter((item: any) => item.traceType === 'tool_result');

const listRawToolContinuations = (memoryManager: MemoryManager) =>
  memoryManager.store
    .list(MemoryType.RAW_TRACE)
    .filter((item: any) => item.traceType === 'tool_continuation');

const listWorkingToolMessages = (memoryManager: MemoryManager) =>
  memoryManager.getWorkingContextMessages()
    .filter((message) => message.role === MessageRole.TOOL);

const originalEnv = { ...process.env };

describe('ToolResultEventHandler', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv, AUTOBYTEUS_STREAM_PARSER: 'xml' };
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('handles a single tool result success without an active batch', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const event = new ToolResultEvent('calculator', { sum: 15 }, 'calc-123');

    await handler.handle(event, context);

    const expectedLogMsg = `[TOOL_RESULT_SUCCESS_PROCESSED] Agent_ID: agent-1, Tool: calculator, Invocation_ID: calc-123, Result: ${formatToCleanString({ sum: 15 })}`;
    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalledWith({
      log_entry: expectedLogMsg,
      tool_invocation_id: 'calc-123',
      tool_name: 'calculator',
      turn_id: null
    });
    expect(notifier.notifyAgentToolExecutionSucceeded).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      tool_name: 'calculator',
      invocation_id: 'calc-123',
      turn_id: null,
      result: { sum: 15 }
    });

    expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueToolContinuationInput.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(UserMessageReceivedEvent);
    const message = enqueued.agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain('Tool: calculator (ID: calc-123)');
    expect(message.contextFiles).toBeNull();
  });

  it('reorders multi-tool results correctly inside the active batch', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const turn = new AgentTurn('turn_0001');
    const invA = new ToolInvocation('tool_A', { arg: 'A' }, 'call_A');
    const invB = new ToolInvocation('tool_B', { arg: 'B' }, 'call_B');
    turn.startToolInvocationBatch([invA, invB]);
    context.state.activeTurn = turn;

    await handler.handle(new ToolResultEvent('tool_B', 'Result B', 'call_B', undefined, undefined, 'turn_0001'), context);
    expect(inputQueues.enqueueToolContinuationInput).not.toHaveBeenCalled();

    await handler.handle(new ToolResultEvent('tool_A', 'Result A', 'call_A', undefined, undefined, 'turn_0001'), context);

    expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);
    const content =
      inputQueues.enqueueToolContinuationInput.mock.calls[0][0].agentInputUserMessage.content;
    const posA = content.indexOf('Tool: tool_A (ID: call_A)');
    const posB = content.indexOf('Tool: tool_B (ID: call_B)');
    expect(posA).toBeGreaterThanOrEqual(0);
    expect(posB).toBeGreaterThanOrEqual(0);
    expect(posA).toBeLessThan(posB);
    expect(context.state.activeTurn?.activeToolInvocationBatch).toBeNull();
  });

  it('ignores mismatched agent-turn results for the active batch', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const turn = new AgentTurn('turn_0001');
    turn.startToolInvocationBatch([new ToolInvocation('tool_A', {}, 'call_A')]);
    context.state.activeTurn = turn;

    await handler.handle(new ToolResultEvent('tool_A', 'wrong', 'call_A', undefined, undefined, 'turn_other'), context);

    expect(inputQueues.enqueueToolContinuationInput).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(context.state.activeTurn?.activeToolInvocationBatch).not.toBeNull();
  });

  it('handles context file results', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const contextFile = new ContextFile('/path/to/image.png', undefined, 'image.png');

    await handler.handle(new ToolResultEvent('read_media_file', contextFile, 'media-1'), context);

    expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);
    const message =
      inputQueues.enqueueToolContinuationInput.mock.calls[0][0].agentInputUserMessage;
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain("The file 'image.png' has been loaded into the context");
    expect(message.contextFiles).toEqual([contextFile]);
  });

  it('uses a native no-user-message continuation event in api_tool_call mode', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new ToolResultEventHandler();
    const { context, inputQueues } = makeContext();
    const turn = new AgentTurn('turn_0001');
    turn.startToolInvocationBatch([new ToolInvocation('tool_A', {}, 'call_A')]);
    context.state.activeTurn = turn;
    context.state.memoryManager = {
      ingestToolContinuationBoundary: vi.fn()
    } as any;

    await handler.handle(new ToolResultEvent('tool_A', 'Result A', 'call_A', undefined, undefined, 'turn_0001'), context);

    expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);
    const event = inputQueues.enqueueToolContinuationInput.mock.calls[0][0];
    expect(event).toBeInstanceOf(ToolContinuationReadyEvent);
    expect(event.turnId).toBe('turn_0001');
    expect(event).not.toBeInstanceOf(UserMessageReceivedEvent);
    expect(context.state.memoryManager?.ingestToolContinuationBoundary).toHaveBeenCalledWith(
      'turn_0001',
      'ToolContinuationReadyEvent',
      'Native API tool continuation'
    );
  });

  it('does not ingest native tool results when no active batch can validate identity', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new ToolResultEventHandler();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-result-handler-no-batch-'));
    const { context, inputQueues } = makeContext();
    const memoryManager = new MemoryManager({
      store: new FileMemoryStore(tempDir, 'agent-1')
    });
    context.state.memoryManager = memoryManager;
    context.config.toolExecutionResultProcessors = [new MemoryIngestToolResultProcessor()];

    try {
      await handler.handle(
        new ToolResultEvent('tool_A', 'orphan result', 'call_A', undefined, undefined, 'turn_0001'),
        context
      );

      expect(listRawToolResults(memoryManager)).toHaveLength(0);
      expect(listWorkingToolMessages(memoryManager)).toHaveLength(0);
      expect(listRawToolContinuations(memoryManager)).toHaveLength(0);
      expect(inputQueues.enqueueToolContinuationInput).not.toHaveBeenCalled();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it.each([
    {
      label: 'missing invocation id',
      event: () => new ToolResultEvent('tool_A', 'missing id result', undefined, undefined, undefined, 'turn_0001')
    },
    {
      label: 'unknown invocation id',
      event: () => new ToolResultEvent('tool_A', 'unknown result', 'call_unknown', undefined, undefined, 'turn_0001')
    },
    {
      label: 'turn-mismatched invocation id',
      event: () => new ToolResultEvent('tool_A', 'wrong turn result', 'call_A', undefined, undefined, 'turn_other')
    }
  ])('does not ingest rejected native tool results before acceptance: $label', async ({ event }) => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, memoryManager, tempDir } = makeNativeMemoryContext();

    try {
      await handler.handle(event(), context);

      expect(listRawToolResults(memoryManager)).toHaveLength(0);
      expect(listWorkingToolMessages(memoryManager)).toHaveLength(0);
      expect(listRawToolContinuations(memoryManager)).toHaveLength(0);
      expect(inputQueues.enqueueToolContinuationInput).not.toHaveBeenCalled();
      expect(context.state.activeTurn?.activeToolInvocationBatch).not.toBeNull();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not ingest duplicate in-turn native results more than once', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, memoryManager, tempDir } = makeNativeMemoryContext([
      { name: 'tool_A', id: 'call_A' },
      { name: 'tool_B', id: 'call_B' }
    ]);

    try {
      await handler.handle(
        new ToolResultEvent('tool_A', 'first result', 'call_A', undefined, undefined, 'turn_0001'),
        context
      );
      await handler.handle(
        new ToolResultEvent('tool_A', 'duplicate result', 'call_A', undefined, undefined, 'turn_0001'),
        context
      );

      expect(listRawToolResults(memoryManager)).toHaveLength(1);
      expect(listWorkingToolMessages(memoryManager)).toHaveLength(1);
      expect(listRawToolContinuations(memoryManager)).toHaveLength(0);
      expect(inputQueues.enqueueToolContinuationInput).not.toHaveBeenCalled();

      await handler.handle(
        new ToolResultEvent('tool_B', 'second result', 'call_B', undefined, undefined, 'turn_0001'),
        context
      );

      expect(listRawToolResults(memoryManager)).toHaveLength(2);
      expect(listWorkingToolMessages(memoryManager)).toHaveLength(2);
      expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);
      expect(inputQueues.enqueueToolContinuationInput.mock.calls[0][0]).toBeInstanceOf(ToolContinuationReadyEvent);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not ingest late duplicate native results after the active batch is cleared', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, memoryManager, tempDir } = makeNativeMemoryContext();

    try {
      await handler.handle(
        new ToolResultEvent('tool_A', 'accepted result', 'call_A', undefined, undefined, 'turn_0001'),
        context
      );

      expect(context.state.activeTurn?.activeToolInvocationBatch).toBeNull();
      expect(listRawToolResults(memoryManager)).toHaveLength(1);
      expect(listWorkingToolMessages(memoryManager)).toHaveLength(1);
      expect(listRawToolContinuations(memoryManager)).toHaveLength(1);
      expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);

      await handler.handle(
        new ToolResultEvent('tool_A', 'late duplicate result', 'call_A', undefined, undefined, 'turn_0001'),
        context
      );

      expect(listRawToolResults(memoryManager)).toHaveLength(1);
      expect(listWorkingToolMessages(memoryManager)).toHaveLength(1);
      expect(listRawToolContinuations(memoryManager)).toHaveLength(1);
      expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ingests accepted native result once and renders matching structured tool history', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, memoryManager, tempDir } = makeNativeMemoryContext();

    try {
      await handler.handle(
        new ToolResultEvent('tool_A', 'accepted result', 'call_A', undefined, undefined, 'turn_0001'),
        context
      );

      expect(listRawToolResults(memoryManager)).toHaveLength(1);
      expect(listWorkingToolMessages(memoryManager)).toHaveLength(1);
      expect(listRawToolContinuations(memoryManager)).toHaveLength(1);
      expect(inputQueues.enqueueToolContinuationInput).toHaveBeenCalledTimes(1);
      expect(inputQueues.enqueueToolContinuationInput.mock.calls[0][0]).toBeInstanceOf(ToolContinuationReadyEvent);

      const rendered = await new OpenAIChatRenderer().render(memoryManager.getWorkingContextMessages()) as Array<Record<string, any>>;
      expect(rendered.some((message) => message.role === 'assistant' && message.tool_calls?.[0]?.id === 'call_A')).toBe(true);
      expect(rendered.some((message) => message.role === 'tool' && message.tool_call_id === 'call_A')).toBe(true);
      expect(
        rendered.some(
          (message) =>
            message.role === 'user' &&
            typeof message.content === 'string' &&
            message.content.startsWith('The following tool executions have completed')
        )
      ).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('skips invalid event types', async () => {
    const handler = new ToolResultEventHandler();
    const { context, inputQueues, notifier } = makeContext();
    const invalidEvent = new GenericEvent({}, 'wrong_event');

    await handler.handle(invalidEvent as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('ToolResultEventHandler received non-ToolResultEvent: GenericEvent. Skipping.')
      )
    ).toBe(true);
    expect(notifier.notifyAgentDataToolLog).not.toHaveBeenCalled();
    expect(inputQueues.enqueueToolContinuationInput).not.toHaveBeenCalled();
  });
});
