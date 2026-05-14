import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  bootstrapRun: vi.fn(async () => true),
  shutdownRun: vi.fn(async () => true),
  runnerRun: vi.fn(async (_event: unknown) => ({ kind: 'completed', turnId: 'turn-1' }))
}));

vi.mock('../../../../src/agent/bootstrap-steps/agent-bootstrapper.js', () => ({
  AgentBootstrapper: class MockAgentBootstrapper {
    run = mocks.bootstrapRun;
  }
}));

vi.mock('../../../../src/agent/shutdown-steps/agent-shutdown-orchestrator.js', () => ({
  AgentShutdownOrchestrator: class MockAgentShutdownOrchestrator {
    run = mocks.shutdownRun;
  }
}));

vi.mock('../../../../src/agent/loop/agent-turn-runner.js', () => ({
  AgentTurnRunner: class MockAgentTurnRunner {
    run = mocks.runnerRun;
  }
}));

import { AgentWorker } from '../../../../src/agent/runtime/agent-worker.js';
import { AgentEventInbox } from '../../../../src/agent/event-inbox/agent-event-inbox.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentStatusDeriver } from '../../../../src/agent/status/status-deriver.js';
import { ToolExecutionApprovalEvent, UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import type { Message } from '../../../../src/llm/utils/messages.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponseType> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForCondition = async (predicate: () => boolean, timeoutMs = 1000): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await delay(10);
  }
  return false;
};

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

  context.state.statusManagerRef = { emit_status_update: vi.fn(async () => undefined) } as any;
  context.state.statusDeriver = new AgentStatusDeriver(AgentStatus.UNINITIALIZED);
  context.state.memoryManager = {
    startTurn: () => 'turn-1',
    createWorkingContextTurnCheckpoint: (turnId: string) => ({ turnId, messages: [], lastCompactionTs: null }),
    restoreWorkingContextTurnCheckpoint: vi.fn()
  } as any;
  return context;
};

describe('AgentWorker', () => {
  beforeEach(() => {
    mocks.bootstrapRun.mockReset().mockResolvedValue(true);
    mocks.shutdownRun.mockReset().mockResolvedValue(true);
    mocks.runnerRun.mockReset().mockResolvedValue({ kind: 'completed', turnId: 'turn-1' });
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('initializes with context and no normal-flow dispatcher dependency', () => {
    const context = makeContext();
    const worker = new AgentWorker(context, { ignored: true } as any);

    expect(worker.context).toBe(context);
    expect(worker.isAlive()).toBe(false);
    expect(worker.statusManager).toBe(context.statusManager);
    expect((worker as any).workerEventDispatcher).toBeUndefined();
  });

  it('direct bootstrap lifecycle reaches idle when bootstrap succeeds', async () => {
    const context = makeContext();
    const worker = new AgentWorker(context);

    const success = await (worker as any).initialize();

    expect(success).toBe(true);
    expect(mocks.bootstrapRun).toHaveBeenCalledWith(context);
    expect(context.currentStatus).toBe(AgentStatus.IDLE);
  });

  it('direct bootstrap lifecycle reaches error when bootstrap fails', async () => {
    const context = makeContext();
    mocks.bootstrapRun.mockResolvedValue(false);
    const worker = new AgentWorker(context);

    const success = await (worker as any).initialize();

    expect(success).toBe(false);
    expect(context.currentStatus).toBe(AgentStatus.ERROR);
  });

  it('runs one AgentTurnRunner for an external scheduler event', async () => {
    const context = makeContext();
    context.state.agentEventInbox = new AgentEventInbox();
    const worker = new AgentWorker(context);
    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);

    worker.start();
    await delay(10);
    await context.state.agentEventInbox.postUserEvent(
      new UserMessageReceivedEvent(new AgentInputUserMessage('hello'))
    );

    expect(await waitForCondition(() => mocks.runnerRun.mock.calls.length === 1)).toBe(true);
    expect(context.state.activeTurn).toBeNull();

    await worker.stop(0.2);
  });

  it('start/stop lifecycle toggles isAlive and runs shutdown cleanup', async () => {
    const context = makeContext();
    context.state.agentEventInbox = new AgentEventInbox();
    const worker = new AgentWorker(context);
    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);

    worker.start();
    await delay(10);
    expect(worker.isAlive()).toBe(true);

    await worker.stop(0.5);
    expect(worker.isAlive()).toBe(false);
    expect(mocks.shutdownRun).toHaveBeenCalledWith(context);
  });

  it('does not start a queued external turn after stop is requested', async () => {
    const context = makeContext();
    const worker = new AgentWorker(context);
    (worker as any).stopRequested = true;

    const result = await (worker as any).startTurnRunner(
      new UserMessageReceivedEvent(new AgentInputUserMessage('queued before stop wake'))
    );

    expect(result).toMatchObject({ accepted: false, code: 'runtime_stopping' });
    expect(mocks.runnerRun).not.toHaveBeenCalled();
  });

  it('keeps the scheduler loop alive for active-turn tool approval messages while a runner is active', async () => {
    const context = makeContext();
    context.state.agentEventInbox = new AgentEventInbox();
    let releaseRunner!: () => void;
    mocks.runnerRun.mockImplementation(async () => {
      await new Promise<void>((resolve) => { releaseRunner = resolve; });
      return { kind: 'completed', turnId: 'turn-1' };
    });
    const worker = new AgentWorker(context);
    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);

    worker.start();
    await delay(10);
    await context.state.agentEventInbox.postUserEvent(
      new UserMessageReceivedEvent(new AgentInputUserMessage('hello'))
    );

    expect(await waitForCondition(() => context.state.activeTurn !== null)).toBe(true);
    const activeTurn = context.state.activeTurn!;
    activeTurn.startToolInvocationBatch([new ToolInvocation('tool', {}, 'inv-approval', activeTurn.turnId)]);
    context.state.storePendingToolInvocation(new ToolInvocation('tool', {}, 'inv-approval', activeTurn.turnId));
    const approvalPromise = activeTurn.toolInputPort.waitForApproval('inv-approval', {
      signal: activeTurn.executionScope.signal
    });

    const postPromise = context.state.agentEventInbox.postToolApprovalEvent(
      new ToolExecutionApprovalEvent('inv-approval', true, 'ok', activeTurn.turnId)
    );

    await expect(postPromise).resolves.toMatchObject({ accepted: true, code: 'posted' });
    await expect(approvalPromise).resolves.toMatchObject({ isApproved: true, toolInvocationId: 'inv-approval' });

    releaseRunner();
    expect(await waitForCondition(() => context.state.activeTurn === null)).toBe(true);
    await worker.stop(0.2);
  });

  it('settles queued awaitable inbox commands during shutdown drain', async () => {
    const context = makeContext();
    context.state.agentEventInbox = new AgentEventInbox();
    const worker = new AgentWorker(context);
    const approvalPromise = context.state.agentEventInbox.postToolApprovalEvent(
      new ToolExecutionApprovalEvent('approval-shutdown', true)
    );

    (worker as any).settleQueuedAwaitablesForShutdown();

    await expect(approvalPromise).resolves.toMatchObject({
      accepted: false,
      code: 'runtime_stopped',
      invocationId: 'approval-shutdown'
    });
    expect(context.state.agentEventInbox.qsize()).toBe(0);
  });
});
