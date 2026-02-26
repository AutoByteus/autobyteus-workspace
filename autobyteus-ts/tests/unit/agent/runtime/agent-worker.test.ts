import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentWorker } from '../../../../src/agent/runtime/agent-worker.js';
import { AgentInputEventQueueManager } from '../../../../src/agent/events/agent-input-event-queue-manager.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentStatusDeriver } from '../../../../src/agent/status/status-deriver.js';
import { UserMessageReceivedEvent, BootstrapStartedEvent } from '../../../../src/agent/events/agent-events.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
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
  const context = new AgentContext('agent-1', config, state);

  context.state.statusManagerRef = { emit_status_update: vi.fn(async () => undefined) } as any;
  context.state.statusDeriver = new AgentStatusDeriver(AgentStatus.BOOTSTRAPPING);
  return context;
};

describe('AgentWorker', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('initializes with context and dispatcher', () => {
    const context = makeContext();
    const worker = new AgentWorker(context, { getHandler: vi.fn() } as any);

    expect(worker.context).toBe(context);
    expect(worker.isAlive()).toBe(false);
    expect(worker.statusManager).toBe(context.statusManager);
  });

  it('start/stop lifecycle toggles isAlive', async () => {
    const context = makeContext();
    context.state.inputEventQueues = new AgentInputEventQueueManager();
    const worker = new AgentWorker(context, { getHandler: vi.fn() } as any);

    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);

    worker.start();
    await new Promise((r) => setTimeout(r, 10));
    expect(worker.isAlive()).toBe(true);

    await worker.stop(0.5);
    expect(worker.isAlive()).toBe(false);
  });

  it('initialize succeeds when bootstrap reaches IDLE', async () => {
    const context = makeContext();
    const inputQueues = {
      enqueueInternalSystemEvent: vi.fn(async () => undefined),
      getNextInternalEvent: vi.fn(async () => {
        if (!(getNext as any).yielded) {
          (getNext as any).yielded = true;
          return ['internalSystemEventQueue', new UserMessageReceivedEvent({} as any)];
        }
        await new Promise((r) => setTimeout(r, 5));
        return null;
      })
    } as any;
    const getNext = inputQueues.getNextInternalEvent;
    context.state.inputEventQueues = inputQueues;

    const worker = new AgentWorker(context, { getHandler: vi.fn() } as any);
    worker.workerEventDispatcher.dispatch = vi.fn(async (_event, ctx) => {
      ctx.currentStatus = AgentStatus.IDLE;
      ctx.state.statusDeriver = new AgentStatusDeriver(AgentStatus.IDLE);
    });

    const success = await (worker as any).initialize();

    expect(success).toBe(true);
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalled();
    expect(inputQueues.enqueueInternalSystemEvent.mock.calls[0][0]).toBeInstanceOf(BootstrapStartedEvent);
  });

  it('initialize fails when bootstrap reaches ERROR', async () => {
    const context = makeContext();
    const inputQueues = {
      enqueueInternalSystemEvent: vi.fn(async () => undefined),
      getNextInternalEvent: vi.fn(async () => {
        if (!(getNext as any).yielded) {
          (getNext as any).yielded = true;
          return ['internalSystemEventQueue', new UserMessageReceivedEvent({} as any)];
        }
        await new Promise((r) => setTimeout(r, 5));
        return null;
      })
    } as any;
    const getNext = inputQueues.getNextInternalEvent;
    context.state.inputEventQueues = inputQueues;

    const worker = new AgentWorker(context, { getHandler: vi.fn() } as any);
    worker.workerEventDispatcher.dispatch = vi.fn(async (_event, ctx) => {
      ctx.currentStatus = AgentStatus.ERROR;
      ctx.state.statusDeriver = new AgentStatusDeriver(AgentStatus.ERROR);
    });

    const success = await (worker as any).initialize();

    expect(success).toBe(false);
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalled();
    expect(inputQueues.enqueueInternalSystemEvent.mock.calls[0][0]).toBeInstanceOf(BootstrapStartedEvent);
  });

  it('processes events from queue', async () => {
    const context = makeContext();
    const inputQueues = {
      enqueueInternalSystemEvent: vi.fn(async () => undefined),
      getNextInputEvent: vi.fn(async () => {
        if (!(getNext as any).yielded) {
          (getNext as any).yielded = true;
          return ['userMessageInputQueue', new UserMessageReceivedEvent({} as any)];
        }
        await new Promise((r) => setTimeout(r, 20));
        return null;
      })
    } as any;
    const getNext = inputQueues.getNextInputEvent;
    context.state.inputEventQueues = inputQueues;

    const worker = new AgentWorker(context, { getHandler: vi.fn() } as any);
    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);
    worker.workerEventDispatcher.dispatch = vi.fn(async () => undefined);

    worker.start();
    await new Promise((r) => setTimeout(r, 30));

    expect(worker.workerEventDispatcher.dispatch).toHaveBeenCalled();
    await worker.stop(0.2);
  });

  it('stops when dispatcher throws', async () => {
    const context = makeContext();
    const inputQueues = {
      getNextInputEvent: vi.fn(async () => ['userMessageInputQueue', new UserMessageReceivedEvent({} as any)])
    } as any;
    context.state.inputEventQueues = inputQueues;

    const worker = new AgentWorker(context, { getHandler: vi.fn() } as any);
    vi.spyOn(worker as any, 'initialize').mockResolvedValue(true as any);
    worker.workerEventDispatcher.dispatch = vi.fn(async () => {
      throw new Error('Dispatcher failed');
    });

    worker.start();
    await new Promise((r) => setTimeout(r, 20));

    expect(worker.isAlive()).toBe(false);
  });
});
