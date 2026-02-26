import { describe, it, expect, vi, beforeEach } from 'vitest';

const bootstrapRunMock = vi.fn(async () => true);
const shutdownRunMock = vi.fn(async () => true);

vi.mock('../../../../src/agent-team/bootstrap-steps/agent-team-bootstrapper.js', () => ({
  AgentTeamBootstrapper: vi.fn().mockImplementation(function (this: any) {
    this.run = bootstrapRunMock;
  })
}));

vi.mock('../../../../src/agent-team/shutdown-steps/agent-team-shutdown-orchestrator.js', () => ({
  AgentTeamShutdownOrchestrator: vi.fn().mockImplementation(function (this: any) {
    this.run = shutdownRunMock;
  })
}));

import { AgentTeamWorker } from '../../../../src/agent-team/runtime/agent-team-worker.js';
import { AgentTeamRuntimeState } from '../../../../src/agent-team/context/agent-team-runtime-state.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { AgentTeamContext } from '../../../../src/agent-team/context/agent-team-context.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentTeamInputEventQueueManager } from '../../../../src/agent-team/events/agent-team-input-event-queue-manager.js';
import { AgentTeamBootstrapStartedEvent, AgentTeamErrorEvent } from '../../../../src/agent-team/events/agent-team-events.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../../src/llm/user-message.js';

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
  const agent = new AgentConfig('Coordinator', 'Coordinator', 'desc', llm);
  const node = new TeamNodeConfig({ nodeDefinition: agent });
  const config = new AgentTeamConfig({
    name: 'Team',
    description: 'desc',
    nodes: [node],
    coordinatorNode: node
  });
  const state = new AgentTeamRuntimeState({ teamId: 'team-1' });
  const context = new AgentTeamContext('team-1', config, state);
  context.state.statusManagerRef = { emitStatusUpdate: vi.fn(async () => undefined) } as any;
  context.state.inputEventQueues = new AgentTeamInputEventQueueManager();
  return context;
};

describe('AgentTeamWorker', () => {
  beforeEach(() => {
    bootstrapRunMock.mockReset().mockResolvedValue(true);
    shutdownRunMock.mockReset().mockResolvedValue(true);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('initializes with context and dispatcher', () => {
    const context = makeContext();
    const worker = new AgentTeamWorker(context, { getHandler: vi.fn() } as any);

    expect(worker.context).toBe(context);
    expect(worker.isAlive()).toBe(false);
    expect(worker.statusManager).toBe(context.statusManager);
  });

  it('start/stop lifecycle toggles isAlive', async () => {
    const context = makeContext();
    context.state.inputEventQueues = new AgentTeamInputEventQueueManager();
    const worker = new AgentTeamWorker(context, { getHandler: vi.fn() } as any);

    worker.eventDispatcher.dispatch = vi.fn(async () => undefined);

    worker.start();
    await new Promise((r) => setTimeout(r, 10));
    expect(worker.isAlive()).toBe(true);

    await worker.stop(0.5);
    expect(worker.isAlive()).toBe(false);
  });

  it('async_run delegates to bootstrapper', async () => {
    const context = makeContext();
    context.state.inputEventQueues = new AgentTeamInputEventQueueManager();
    const worker = new AgentTeamWorker(context, { getHandler: vi.fn() } as any);
    const dispatchSpy = vi.spyOn(worker.eventDispatcher, 'dispatch').mockResolvedValue(undefined);

    (worker as any).stopRequested = true;
    await worker.asyncRun();

    expect(bootstrapRunMock).toHaveBeenCalledWith(context);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(AgentTeamBootstrapStartedEvent), context);
  });

  it('async_run handles bootstrap failure', async () => {
    const context = makeContext();
    context.state.inputEventQueues = {
      userMessageQueue: { get: vi.fn(async () => undefined) },
      internalSystemEventQueue: { get: vi.fn(async () => undefined) },
      enqueueInternalSystemEvent: vi.fn(async () => undefined)
    } as any;
    const worker = new AgentTeamWorker(context, { getHandler: vi.fn() } as any);
    const dispatchSpy = vi.spyOn(worker.eventDispatcher, 'dispatch').mockResolvedValue(undefined);

    bootstrapRunMock.mockResolvedValueOnce(false);
    await worker.asyncRun();

    expect(bootstrapRunMock).toHaveBeenCalledWith(context);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(AgentTeamBootstrapStartedEvent), context);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(AgentTeamErrorEvent), context);
    expect(context.state.inputEventQueues!.userMessageQueue.get).not.toHaveBeenCalled();
  });

  it('processes events from queue', async () => {
    const context = makeContext();
    let userCalls = 0;
    const userQueue = {
      get: vi.fn(async () => {
        userCalls += 1;
        if (userCalls === 1) {
          return { type: 'user_event' } as any;
        }
        await new Promise((r) => setTimeout(r, 50));
        return { type: 'idle' } as any;
      })
    };
    const systemQueue = {
      get: vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { type: 'system_event' } as any;
      })
    };

    context.state.inputEventQueues = {
      userMessageQueue: userQueue,
      internalSystemEventQueue: systemQueue,
      enqueueInternalSystemEvent: vi.fn(async () => undefined)
    } as any;

    const worker = new AgentTeamWorker(context, { getHandler: vi.fn() } as any);
    worker.eventDispatcher.dispatch = vi.fn(async () => undefined);

    worker.start();
    await new Promise((r) => setTimeout(r, 50));

    expect(worker.eventDispatcher.dispatch).toHaveBeenCalled();
    await worker.stop(1.0);
  });

  it('shutdown delegates to orchestrator', async () => {
    const context = makeContext();
    context.state.inputEventQueues = new AgentTeamInputEventQueueManager();
    const worker = new AgentTeamWorker(context, { getHandler: vi.fn() } as any);
    worker.eventDispatcher.dispatch = vi.fn(async () => undefined);

    worker.start();
    await new Promise((r) => setTimeout(r, 20));
    await worker.stop(0.5);

    expect(shutdownRunMock).toHaveBeenCalledWith(context);
  });
});
