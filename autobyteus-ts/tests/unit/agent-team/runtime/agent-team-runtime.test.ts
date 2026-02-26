import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  workerInstance: {
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    isAlive: vi.fn().mockReturnValue(false),
    addDoneCallback: vi.fn(),
    getWorkerLoop: vi.fn().mockReturnValue({})
  },
  statusManagerInstance: {
    emitStatusUpdate: vi.fn(async () => undefined)
  }
}));

vi.mock('../../../../src/agent-team/runtime/agent-team-worker.js', () => {
  class MockAgentTeamWorker {
    start = mocks.workerInstance.start;
    stop = mocks.workerInstance.stop;
    isAlive = mocks.workerInstance.isAlive;
    addDoneCallback = mocks.workerInstance.addDoneCallback;
    getWorkerLoop = mocks.workerInstance.getWorkerLoop;
  }
  return { AgentTeamWorker: MockAgentTeamWorker };
});

vi.mock('../../../../src/agent-team/status/agent-team-status-manager.js', () => {
  class MockAgentTeamStatusManager {
    constructor() {
      return mocks.statusManagerInstance;
    }
  }
  return { AgentTeamStatusManager: MockAgentTeamStatusManager };
});

import { AgentTeamRuntime } from '../../../../src/agent-team/runtime/agent-team-runtime.js';
import { AgentTeamRuntimeState } from '../../../../src/agent-team/context/agent-team-runtime-state.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { AgentTeamContext } from '../../../../src/agent-team/context/agent-team-context.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import {
  AgentTeamShutdownRequestedEvent,
  AgentTeamStoppedEvent,
  AgentTeamErrorEvent,
  ProcessUserMessageEvent
} from '../../../../src/agent-team/events/agent-team-events.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
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
  const agent = new AgentConfig('Coordinator', 'Coordinator', 'desc', llm);
  const node = new TeamNodeConfig({ nodeDefinition: agent });
  const config = new AgentTeamConfig({
    name: 'Team',
    description: 'desc',
    nodes: [node],
    coordinatorNode: node
  });
  const state = new AgentTeamRuntimeState({ teamId: 'team-1' });
  return new AgentTeamContext('team-1', config, state);
};

describe('AgentTeamRuntime', () => {
  beforeEach(() => {
    mocks.workerInstance.start.mockReset();
    mocks.workerInstance.stop.mockReset();
    mocks.workerInstance.isAlive.mockReset();
    mocks.workerInstance.addDoneCallback.mockReset();
    mocks.workerInstance.getWorkerLoop.mockReset();
    mocks.statusManagerInstance.emitStatusUpdate.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes components and wires status manager', () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);

    expect(runtime.notifier.teamId).toBe(context.teamId);
    expect(runtime.statusManager).toBe(mocks.statusManagerInstance);
    expect(context.state.statusManagerRef).toBe(mocks.statusManagerInstance);
    expect(mocks.workerInstance.addDoneCallback).toHaveBeenCalledOnce();
    expect(context.state.multiplexerRef).toBe(runtime.multiplexer);
  });

  it('start delegates to worker', () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(false);
    runtime.start();

    expect(mocks.workerInstance.start).toHaveBeenCalledOnce();
  });

  it('start is idempotent when worker alive', () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.start();

    expect(mocks.workerInstance.start).not.toHaveBeenCalled();
  });

  it('stop runs full flow when worker alive', async () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(true);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    await runtime.stop(0.1);

    expect(runtime.applyEventAndDeriveStatus).toHaveBeenCalledTimes(2);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(
      AgentTeamShutdownRequestedEvent
    );
    expect(mocks.workerInstance.stop).toHaveBeenCalledWith(0.1);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[1][0]).toBeInstanceOf(
      AgentTeamStoppedEvent
    );
  });

  it('stop returns early when worker not alive', async () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(false);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    await runtime.stop(0.1);

    expect(runtime.applyEventAndDeriveStatus).toHaveBeenCalledTimes(1);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(
      AgentTeamStoppedEvent
    );
    expect(mocks.workerInstance.stop).not.toHaveBeenCalled();
  });

  it('submitEvent routes to correct queue', async () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(true);

    const inputQueues = {
      enqueueUserMessage: vi.fn(async () => undefined),
      enqueueInternalSystemEvent: vi.fn(async () => undefined)
    } as any;
    context.state.inputEventQueues = inputQueues;

    const userEvent = new ProcessUserMessageEvent({} as any, 'Coordinator');
    await runtime.submitEvent(userEvent);

    expect(inputQueues.enqueueUserMessage).toHaveBeenCalledWith(userEvent);
    expect(inputQueues.enqueueInternalSystemEvent).not.toHaveBeenCalled();

    inputQueues.enqueueUserMessage.mockClear();
    inputQueues.enqueueInternalSystemEvent.mockClear();

    const otherEvent = new AgentTeamErrorEvent('oops');
    await runtime.submitEvent(otherEvent);

    expect(inputQueues.enqueueUserMessage).not.toHaveBeenCalled();
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledWith(otherEvent);
  });

  it('handles worker completion with error', () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);
    runtime.applyEventAndDeriveStatus = vi.fn(async () => undefined) as any;

    (runtime as any).handleWorkerCompletion({ status: 'rejected', reason: new Error('Worker crashed') } as any);

    expect(runtime.applyEventAndDeriveStatus).toHaveBeenCalledTimes(2);
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[0][0]).toBeInstanceOf(
      AgentTeamErrorEvent
    );
    expect((runtime.applyEventAndDeriveStatus as any).mock.calls[1][0]).toBeInstanceOf(
      AgentTeamStoppedEvent
    );
  });

  it('exposes isRunning', () => {
    const context = makeContext();
    const runtime = new AgentTeamRuntime(context, {} as any);

    mocks.workerInstance.isAlive.mockReturnValue(true);
    expect(runtime.isRunning).toBe(true);

    mocks.workerInstance.isAlive.mockReturnValue(false);
    expect(runtime.isRunning).toBe(false);
  });
});
