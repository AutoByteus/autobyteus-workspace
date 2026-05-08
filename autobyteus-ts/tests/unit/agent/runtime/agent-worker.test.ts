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
import { AgentInputBox } from '../../../../src/agent/input-box/agent-input-box.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentStatusDeriver } from '../../../../src/agent/status/status-deriver.js';
import { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
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
    context.state.agentInputBox = new AgentInputBox();
    const worker = new AgentWorker(context);
    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);

    worker.start();
    await delay(10);
    await context.state.agentInputBox.enqueueUserMessage(
      new UserMessageReceivedEvent(new AgentInputUserMessage('hello'))
    );

    expect(await waitForCondition(() => mocks.runnerRun.mock.calls.length === 1)).toBe(true);
    expect(context.state.activeTurn).toBeNull();

    await worker.stop(0.2);
  });

  it('start/stop lifecycle toggles isAlive and runs shutdown cleanup', async () => {
    const context = makeContext();
    context.state.agentInputBox = new AgentInputBox();
    const worker = new AgentWorker(context);
    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);

    worker.start();
    await delay(10);
    expect(worker.isAlive()).toBe(true);

    await worker.stop(0.5);
    expect(worker.isAlive()).toBe(false);
    expect(mocks.shutdownRun).toHaveBeenCalledWith(context);
  });
});
