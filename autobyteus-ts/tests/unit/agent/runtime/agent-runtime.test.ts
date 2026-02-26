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
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { ShutdownRequestedEvent, AgentStoppedEvent, AgentErrorEvent } from '../../../../src/agent/events/agent-events.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../../src/llm/user-message.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

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
});
