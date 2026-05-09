import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  workerInstance: {
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    isAlive: vi.fn().mockReturnValue(false),
    addDoneCallback: vi.fn()
  },
  statusManagerInstance: {
    emit_status_update: vi.fn(async () => undefined)
  },
  registerContext: vi.fn(),
  unregisterContext: vi.fn()
}));

vi.mock('../../../../src/agent/runtime/agent-worker.js', () => {
  class MockAgentWorker {
    start = mocks.workerInstance.start;
    stop = mocks.workerInstance.stop;
    isAlive = mocks.workerInstance.isAlive;
    addDoneCallback = mocks.workerInstance.addDoneCallback;
  }
  return { AgentWorker: MockAgentWorker };
});

vi.mock('../../../../src/agent/status/manager.js', () => {
  class MockAgentStatusManager {
    constructor() {
      return mocks.statusManagerInstance;
    }
  }
  return { AgentStatusManager: MockAgentStatusManager };
});

vi.mock('../../../../src/agent/context/agent-context-registry.js', () => {
  class MockAgentContextRegistry {
    registerContext = mocks.registerContext;
    unregisterContext = mocks.unregisterContext;
  }
  return { AgentContextRegistry: MockAgentContextRegistry };
});

import { AgentRuntime } from '../../../../src/agent/runtime/agent-runtime.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentInputBox } from '../../../../src/agent/input-box/agent-input-box.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import {
  ShutdownRequestedEvent,
  AgentStoppedEvent,
  AgentErrorEvent,
  AgentInterruptRequestedEvent,
  UserMessageReceivedEvent,
  ToolExecutionApprovalEvent,
  PendingToolInvocationEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../../src/llm/user-message.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import type { Message } from '../../../../src/llm/utils/messages.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponseType> {
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
  state.memoryManager = {
    startTurn: () => 'turn-1',
    createWorkingContextTurnCheckpoint: (turnId: string) => ({ turnId, messages: [], lastCompactionTs: null }),
    restoreWorkingContextTurnCheckpoint: vi.fn()
  } as any;
  return new AgentContext('agent-1', config, state);
};

describe('AgentRuntime', () => {
  beforeEach(() => {
    mocks.workerInstance.start.mockReset();
    mocks.workerInstance.stop.mockReset();
    mocks.workerInstance.isAlive.mockReset();
    mocks.workerInstance.addDoneCallback.mockReset();
    mocks.registerContext.mockReset();
    mocks.unregisterContext.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes components and registers context', () => {
    const context = makeContext();
    const registry = {} as any;

    const runtime = new AgentRuntime(context, registry);

    expect(runtime.externalEventNotifier.agentId).toBe(context.agentId);
    expect(runtime.statusManager).toBe(mocks.statusManagerInstance);
    expect(context.state.statusManagerRef).toBe(mocks.statusManagerInstance);
    expect(mocks.workerInstance.addDoneCallback).toHaveBeenCalledOnce();
    expect(mocks.registerContext).toHaveBeenCalledWith(context);
  });

  it('start delegates to worker', () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(false);
    runtime.start();

    expect(mocks.workerInstance.start).toHaveBeenCalledOnce();
  });

  it('start is idempotent when worker alive', () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.start();

    expect(mocks.workerInstance.start).not.toHaveBeenCalled();
  });

  it('stop runs full flow when worker alive', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    await runtime.stop(0.1);

    expect(runtime.applyEventAndDeriveStatus).toHaveBeenCalledTimes(2);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(ShutdownRequestedEvent);
    expect(mocks.workerInstance.stop).toHaveBeenCalledWith(0.1);
    expect(mocks.unregisterContext).toHaveBeenCalledWith(context.agentId);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[1][0]).toBeInstanceOf(AgentStoppedEvent);
  });

  it('stop returns early when worker not alive', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(false);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    await runtime.stop(0.1);

    expect(runtime.applyEventAndDeriveStatus).toHaveBeenCalledTimes(1);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(AgentStoppedEvent);
    expect(mocks.workerInstance.stop).not.toHaveBeenCalled();
    expect(mocks.unregisterContext).not.toHaveBeenCalled();
  });

  it('handles worker completion with error', () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    (runtime as any).handleWorkerCompletion({ status: 'rejected', reason: new Error('Worker crashed') } as any);

    expect(runtime.applyEventAndDeriveStatus).toHaveBeenCalledTimes(2);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(AgentErrorEvent);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[1][0]).toBeInstanceOf(AgentStoppedEvent);
  });

  it('exposes currentStatus and isRunning', () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);

    context.currentStatus = AgentStatus.IDLE;
    expect(runtime.currentStatus).toBe(AgentStatus.IDLE);

    mocks.workerInstance.isAlive.mockReturnValue(true);
    expect(runtime.isRunning).toBe(true);

    mocks.workerInstance.isAlive.mockReturnValue(false);
    expect(runtime.isRunning).toBe(false);
  });

  it('interrupt returns no_active_turn when worker is inactive', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(false);
    const result = await runtime.interrupt({ reason: 'user_interrupt' });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe('no_active_turn');
    expect(result.turnId).toBeNull();
  });

  it('interrupt signals the active turn without stopping the worker', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    const activeTurn = context.state.startActiveTurn('turn-1');
    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    const interruptPromise = runtime.interrupt({
      turnId: 'turn-1',
      reason: 'user_interrupt',
      timeoutMs: 100
    });

    await Promise.resolve();
    expect(activeTurn.executionScope.signal.aborted).toBe(true);
    activeTurn.settle({ kind: 'interrupted', turnId: 'turn-1', reason: 'user_interrupt' });
    const result = await interruptPromise;

    expect(result.accepted).toBe(true);
    expect(result.status).toBe('accepted');
    expect(result.turnId).toBe('turn-1');
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(
      AgentInterruptRequestedEvent
    );
    expect(mocks.workerInstance.stop).not.toHaveBeenCalled();
  });

  it('interrupt rejects mismatched turn ids without signaling the active turn', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    const activeTurn = context.state.startActiveTurn('turn-1');
    mocks.workerInstance.isAlive.mockReturnValue(true);

    const result = await runtime.interrupt({ turnId: 'other-turn', reason: 'user_interrupt' });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe('turn_mismatch');
    expect(activeTurn.executionScope.signal.aborted).toBe(false);
  });

  it('posts valid tool approvals through runtime state into the active turn input box', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    const activeTurn = context.state.startActiveTurn('turn-1');
    context.state.storePendingToolInvocation(new ToolInvocation('tool', {}, 'inv-1', 'turn-1'));
    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    const approvalPromise = activeTurn.inputBox.waitForApproval('inv-1', {
      signal: activeTurn.executionScope.signal
    });
    const result = await runtime.postToolApproval({
      kind: 'tool_approval',
      invocationId: 'inv-1',
      turnId: 'turn-1',
      approved: true,
      reason: 'approved'
    });
    const delivered = await approvalPromise;

    expect(result).toEqual({
      accepted: true,
      code: 'posted',
      turnId: 'turn-1',
      invocationId: 'inv-1'
    });
    expect(delivered).toMatchObject({
      kind: 'tool_approval',
      invocationId: 'inv-1',
      turnId: 'turn-1',
      approved: true,
      reason: 'approved'
    });
    expect(runtime.applyEventAndDeriveStatus).toHaveBeenCalledOnce();
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(ToolExecutionApprovalEvent);
  });

  it('returns no_pending_invocation for unknown active-turn tool approvals without status mutation', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    context.state.startActiveTurn('turn-1');
    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    const result = await runtime.postToolApproval({
      kind: 'tool_approval',
      invocationId: 'missing-invocation',
      approved: true
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe('no_pending_invocation');
    expect(runtime.applyEventAndDeriveStatus).not.toHaveBeenCalled();
  });

  it('returns explicit stale/no-active/interrupted approval results without starting turn work', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    const noActive = await runtime.postToolApproval({
      kind: 'tool_approval',
      invocationId: 'inv-1',
      approved: true
    });
    expect(noActive.accepted).toBe(false);
    expect(noActive.code).toBe('no_active_turn');

    const activeTurn = context.state.startActiveTurn('turn-1');
    context.state.storePendingToolInvocation(new ToolInvocation('tool', {}, 'inv-1', 'turn-1'));
    const stale = await runtime.postToolApproval({
      kind: 'tool_approval',
      invocationId: 'inv-1',
      turnId: 'old-turn',
      approved: true
    });
    expect(stale.accepted).toBe(false);
    expect(stale.code).toBe('stale_turn');

    activeTurn.interrupt('user_interrupt');
    const interrupted = await runtime.postToolApproval({
      kind: 'tool_approval',
      invocationId: 'inv-1',
      turnId: 'turn-1',
      approved: true
    });
    expect(interrupted.accepted).toBe(false);
    expect(interrupted.code).toBe('interrupted_turn');
    expect(runtime.applyEventAndDeriveStatus).not.toHaveBeenCalled();
    expect(mocks.workerInstance.start).not.toHaveBeenCalled();
  });

  it('returns runtime_stopped for tool approvals when the worker is inactive', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    mocks.workerInstance.isAlive.mockReturnValue(false);

    const result = await runtime.postToolApproval({
      kind: 'tool_approval',
      invocationId: 'inv-1',
      approved: true
    });

    expect(result).toEqual({
      accepted: false,
      code: 'runtime_stopped',
      invocationId: 'inv-1',
      message: "Agent 'agent-1' runtime is not running."
    });
    expect(mocks.workerInstance.start).not.toHaveBeenCalled();
  });

  it('routes external turn-starting input through AgentInputBox', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    const agentInputBox = new AgentInputBox();
    agentInputBox.enqueueUserMessage = vi.fn(async () => undefined) as any;
    context.state.agentInputBox = agentInputBox;
    mocks.workerInstance.isAlive.mockReturnValue(true);

    const event = new UserMessageReceivedEvent(new AgentInputUserMessage('hello'));
    await runtime.submitEvent(event);

    expect(agentInputBox.enqueueUserMessage).toHaveBeenCalledWith(event);
  });

  it('rejects unsupported turn-local operational events instead of queuing them as lifecycle input', async () => {
    const context = makeContext();
    const runtime = new AgentRuntime(context, {} as any);
    const agentInputBox = new AgentInputBox();
    agentInputBox.enqueueLifecycleMessage = vi.fn(async () => undefined) as any;
    context.state.agentInputBox = agentInputBox;
    mocks.workerInstance.isAlive.mockReturnValue(true);

    await expect(
      runtime.submitEvent(new PendingToolInvocationEvent(new ToolInvocation('tool', {}, 'invocation-1')))
    ).rejects.toThrow(/unsupported runtime input event 'PendingToolInvocationEvent'/);

    await expect(
      runtime.submitEvent(new ToolExecutionApprovalEvent('invocation-1', true))
    ).rejects.toThrow(/unsupported runtime input event 'ToolExecutionApprovalEvent'/);

    expect(agentInputBox.enqueueLifecycleMessage).not.toHaveBeenCalled();
  });
});
