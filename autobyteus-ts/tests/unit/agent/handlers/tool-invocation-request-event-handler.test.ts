import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolInvocationRequestEventHandler } from '../../../../src/agent/handlers/tool-invocation-request-event-handler.js';
import {
  ExecuteToolInvocationEvent,
  GenericEvent,
  PendingToolInvocationEvent
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

describe('ToolInvocationRequestEventHandler', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('stores pending approval requests and emits an approval payload with agent turn id', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'mock-id-1', 'turn_0001');
    const notifier = {
      notifyAgentToolApprovalRequested: vi.fn()
    };

    context.config.autoExecuteTools = false;
    context.state.statusManagerRef = { notifier } as any;
    const storeSpy = vi.spyOn(context.state, 'storePendingToolInvocation');

    await handler.handle(new PendingToolInvocationEvent(invocation), context);

    expect(storeSpy).toHaveBeenCalledWith(invocation);
    expect(notifier.notifyAgentToolApprovalRequested).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      tool_name: 'mock_tool',
      invocation_id: 'mock-id-1',
      turn_id: 'turn_0001',
      arguments: { arg1: 'value1' }
    });
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
    expect(inputQueues.enqueueToolResult).not.toHaveBeenCalled();
  });

  it('logs and exits when manual approval is requested without a notifier', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();

    context.config.autoExecuteTools = false;

    await handler.handle(
      new PendingToolInvocationEvent(
        new ToolInvocation('mock_tool', { arg1: 'value1' }, 'mock-id-1', 'turn_0001')
      ),
      context
    );

    expect(errorSpy).toHaveBeenCalledWith(
      "Agent 'agent-1': Notifier is required for manual approval flow but unavailable."
    );
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
  });

  it('enqueues an execution event when tools auto-execute', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();
    const invocation = new ToolInvocation('mock_tool', { arg1: 'value1' }, 'mock-id-2', 'turn_0002');

    context.config.autoExecuteTools = true;

    await handler.handle(new PendingToolInvocationEvent(invocation), context);

    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(ExecuteToolInvocationEvent);
    expect(enqueued.toolInvocation).toBe(invocation);
  });

  it('skips invalid event types', async () => {
    const handler = new ToolInvocationRequestEventHandler();
    const { context, inputQueues } = makeContext();

    await handler.handle(new GenericEvent({}, 'some_other_event') as any, context);

    expect(warnSpy).toHaveBeenCalledWith(
      'ToolInvocationRequestEventHandler received non-PendingToolInvocationEvent: GenericEvent. Skipping.'
    );
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();
  });

  it('logs initialization', () => {
    new ToolInvocationRequestEventHandler();
    expect(infoSpy).toHaveBeenCalledWith('ToolInvocationRequestEventHandler initialized.');
  });
});
