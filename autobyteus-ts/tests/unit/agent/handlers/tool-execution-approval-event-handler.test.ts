import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolExecutionApprovalEventHandler } from '../../../../src/agent/handlers/tool-execution-approval-event-handler.js';
import {
  ExecuteToolInvocationEvent,
  GenericEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent
} from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { Message } from '../../../../src/llm/utils/messages.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[]
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
    enqueueInternalSystemEvent: vi.fn(async () => undefined),
    enqueueToolResult: vi.fn(async () => undefined)
  } as any;

  state.inputEventQueues = inputQueues;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues };
};

describe('ToolExecutionApprovalEventHandler', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('notifies approval and enqueues execution with the retrieved invocation', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation(
      'mock_tool',
      { arg1: 'value1' },
      'test_tool_invocation_id',
      'turn_0001'
    );
    const notifier = {
      notifyAgentToolApproved: vi.fn()
    };

    context.state.statusManagerRef = { notifier } as any;
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(invocation);

    await handler.handle(
      new ToolExecutionApprovalEvent('test_tool_invocation_id', true, 'User approved'),
      context
    );

    expect(notifier.notifyAgentToolApproved).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      tool_name: 'mock_tool',
      invocation_id: 'test_tool_invocation_id',
      turn_id: 'turn_0001',
      reason: 'User approved'
    });
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(ExecuteToolInvocationEvent);
    expect(enqueued.toolInvocation).toBe(invocation);
    expect(inputQueues.enqueueToolResult).not.toHaveBeenCalled();
  });

  it('notifies denial and enqueues a denied tool result with the agent turn id', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation(
      'mock_tool',
      { arg1: 'value1' },
      'test_tool_invocation_id',
      'turn_0002'
    );
    const notifier = {
      notifyAgentToolDenied: vi.fn()
    };

    context.state.statusManagerRef = { notifier } as any;
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(invocation);

    await handler.handle(
      new ToolExecutionApprovalEvent('test_tool_invocation_id', false, 'User denied due to cost.'),
      context
    );

    expect(notifier.notifyAgentToolDenied).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      tool_name: 'mock_tool',
      invocation_id: 'test_tool_invocation_id',
      turn_id: 'turn_0002',
      reason: 'User denied due to cost.',
      error: 'User denied due to cost.'
    });
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
    expect(inputQueues.enqueueToolResult).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(ToolResultEvent);
    expect(enqueued.toolName).toBe('mock_tool');
    expect(enqueued.result).toBeNull();
    expect(enqueued.toolInvocationId).toBe('test_tool_invocation_id');
    expect(enqueued.toolArgs).toEqual({ arg1: 'value1' });
    expect(enqueued.turnId).toBe('turn_0002');
    expect(enqueued.error).toBe('User denied due to cost.');
    expect(enqueued.isDenied).toBe(true);
  });

  it('fills denied results from the active turn when the invocation lacks an agent turn id', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'test_tool_invocation_id');

    context.state.activeTurn = { turnId: 'turn_active' } as any;
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(invocation);

    await handler.handle(new ToolExecutionApprovalEvent('test_tool_invocation_id', false), context);

    const enqueued = inputQueues.enqueueToolResult.mock.calls[0][0];
    expect(enqueued.turnId).toBe('turn_active');
    expect(enqueued.error).toBe('Tool execution was denied by user/system.');
  });

  it('warns and ignores stale approval events', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();
    vi.spyOn(context.state, 'retrievePendingToolInvocation').mockReturnValue(undefined);

    await handler.handle(new ToolExecutionApprovalEvent('unknown-id-000', true), context);

    expect(warnSpy).toHaveBeenCalledWith(
      "Agent 'agent-1': No pending tool invocation found for ID 'unknown-id-000'. Ignoring stale approval."
    );
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
    expect(inputQueues.enqueueToolResult).not.toHaveBeenCalled();
  });

  it('skips invalid event types', async () => {
    const handler = new ToolExecutionApprovalEventHandler();
    const { context, inputQueues } = makeContext();

    await handler.handle(new GenericEvent({}, 'some_other_event') as any, context);

    expect(warnSpy).toHaveBeenCalledWith(
      'ToolExecutionApprovalEventHandler received non-ToolExecutionApprovalEvent: GenericEvent. Skipping.'
    );
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
  });

  it('logs initialization', () => {
    new ToolExecutionApprovalEventHandler();
    expect(infoSpy).toHaveBeenCalledWith('ToolExecutionApprovalEventHandler initialized.');
  });
});
