import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerEventDispatcher } from '../../../../src/agent/events/worker-event-dispatcher.js';
import {
  BaseEvent,
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  LLMCompleteResponseReceivedEvent,
  AgentReadyEvent,
  AgentErrorEvent,
  AgentIdleEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentStatusDeriver } from '../../../../src/agent/status/status-deriver.js';
import { AgentInputEventQueueManager } from '../../../../src/agent/events/agent-input-event-queue-manager.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import type { LLMUserMessage } from '../../../../src/llm/user-message.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import type { AgentEventHandler } from '../../../../src/agent/handlers/base-event-handler.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponseType> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
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
  const context = new AgentContext('agent-1', config, state);

  context.state.inputEventQueues = new AgentInputEventQueueManager();
  context.state.statusDeriver = new AgentStatusDeriver(AgentStatus.IDLE);
  context.currentStatus = AgentStatus.IDLE;

  const emit_status_update = vi.fn(async () => undefined);
  context.state.statusManagerRef = { emit_status_update } as any;

  return { context, emit_status_update };
};

describe('WorkerEventDispatcher', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('warns when no handler exists', async () => {
    const { context } = makeContext();
    const dispatcher = new WorkerEventDispatcher({ getHandler: () => null } as any);

    await dispatcher.dispatch(new BaseEvent(), context);

    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('dispatches to handler and emits status update', async () => {
    const { context, emit_status_update } = makeContext();
    const handler: AgentEventHandler = { handle: vi.fn(async () => undefined) } as any;
    const dispatcher = new WorkerEventDispatcher({ getHandler: () => handler } as any);

    const event = new UserMessageReceivedEvent({} as any);
    await dispatcher.dispatch(event, context);

    expect(handler.handle).toHaveBeenCalledWith(event, context);
    expect(emit_status_update).toHaveBeenCalledOnce();
  });

  it('enqueues AgentErrorEvent when handler throws', async () => {
    const { context } = makeContext();
    const handler: AgentEventHandler = {
      handle: vi.fn(async () => {
        throw new Error('Handler failed');
      })
    } as any;
    const dispatcher = new WorkerEventDispatcher({ getHandler: () => handler } as any);

    const event = new UserMessageReceivedEvent({} as any);
    await dispatcher.dispatch(event, context);

    const idleQueue = context.inputEventQueues.internalSystemEventQueue;
    const errorEvent = idleQueue.tryGet();
    expect(errorEvent).toBeInstanceOf(AgentErrorEvent);
  });

  it('emits status update before handling AgentReadyEvent', async () => {
    const { context, emit_status_update } = makeContext();
    context.currentStatus = AgentStatus.BOOTSTRAPPING;
    context.state.statusDeriver = new AgentStatusDeriver(AgentStatus.BOOTSTRAPPING);

    const handler: AgentEventHandler = { handle: vi.fn(async () => undefined) } as any;
    const dispatcher = new WorkerEventDispatcher({ getHandler: () => handler } as any);

    const event = new AgentReadyEvent();
    await dispatcher.dispatch(event, context);

    expect(emit_status_update).toHaveBeenCalledOnce();
    const statusCall = emit_status_update.mock.invocationCallOrder[0];
    const handlerCall = (handler.handle as any).mock.invocationCallOrder[0];
    expect(statusCall).toBeLessThan(handlerCall);
  });

  it('enqueues AgentIdleEvent after LLMCompleteResponseReceivedEvent when no pending work', async () => {
    const { context } = makeContext();
    context.currentStatus = AgentStatus.AWAITING_LLM_RESPONSE;
    context.state.statusDeriver = new AgentStatusDeriver(AgentStatus.AWAITING_LLM_RESPONSE);
    context.state.pendingToolApprovals = {};

    const handler: AgentEventHandler = { handle: vi.fn(async () => undefined) } as any;
    const dispatcher = new WorkerEventDispatcher({ getHandler: () => handler } as any);

    const event = new LLMCompleteResponseReceivedEvent(new CompleteResponse({ content: 'ok' }));
    await dispatcher.dispatch(event, context);

    const queued = context.inputEventQueues.internalSystemEventQueue.tryGet();
    expect(queued).toBeInstanceOf(AgentIdleEvent);
  });

  it('does not enqueue AgentIdleEvent when approvals pending', async () => {
    const { context } = makeContext();
    context.currentStatus = AgentStatus.AWAITING_LLM_RESPONSE;
    context.state.statusDeriver = new AgentStatusDeriver(AgentStatus.AWAITING_LLM_RESPONSE);
    context.state.pendingToolApprovals = { tid1: new ToolInvocation('tool', {}, 'tid1') };

    const handler: AgentEventHandler = { handle: vi.fn(async () => undefined) } as any;
    const dispatcher = new WorkerEventDispatcher({ getHandler: () => handler } as any);

    const event = new LLMCompleteResponseReceivedEvent(new CompleteResponse({ content: 'ok' }));
    await dispatcher.dispatch(event, context);

    const queued = context.inputEventQueues.internalSystemEventQueue.tryGet();
    expect(queued).toBeUndefined();
  });

  it('does not enqueue AgentIdleEvent when tool invocations pending', async () => {
    const { context } = makeContext();
    context.currentStatus = AgentStatus.AWAITING_LLM_RESPONSE;
    context.state.statusDeriver = new AgentStatusDeriver(AgentStatus.AWAITING_LLM_RESPONSE);
    context.state.pendingToolApprovals = {};

    await context.inputEventQueues.enqueueToolInvocationRequest(
      new PendingToolInvocationEvent(new ToolInvocation('tool', {}, 'tid1'))
    );

    const handler: AgentEventHandler = { handle: vi.fn(async () => undefined) } as any;
    const dispatcher = new WorkerEventDispatcher({ getHandler: () => handler } as any);

    const event = new LLMCompleteResponseReceivedEvent(new CompleteResponse({ content: 'ok' }));
    await dispatcher.dispatch(event, context);

    const queued = context.inputEventQueues.internalSystemEventQueue.tryGet();
    expect(queued).toBeUndefined();
  });
});
