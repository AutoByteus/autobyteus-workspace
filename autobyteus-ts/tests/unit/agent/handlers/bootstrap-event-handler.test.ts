import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BootstrapEventHandler } from '../../../../src/agent/handlers/bootstrap-event-handler.js';
import {
  BootstrapStartedEvent,
  BootstrapStepRequestedEvent,
  BootstrapStepCompletedEvent,
  BootstrapCompletedEvent,
  AgentReadyEvent,
  AgentErrorEvent
} from '../../../../src/agent/events/agent-events.js';
import { BaseBootstrapStep } from '../../../../src/agent/bootstrap-steps/base-bootstrap-step.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';

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
  const config = new AgentConfig('name', 'role', 'desc', llm);
  const state = new AgentRuntimeState('agent-1');
  const inputQueues = { enqueueInternalSystemEvent: vi.fn(async () => undefined) } as any;
  state.inputEventQueues = inputQueues;
  const context = new AgentContext('agent-1', config, state);
  return { context, inputQueues };
};

class SuccessStep extends BaseBootstrapStep {
  async execute(): Promise<boolean> {
    return true;
  }
}

class FailureStep extends BaseBootstrapStep {
  async execute(): Promise<boolean> {
    return false;
  }
}

describe('BootstrapEventHandler', () => {
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

  it('handles bootstrap start with no steps', async () => {
    const handler = new BootstrapEventHandler([]);
    const { context, inputQueues } = makeContext();

    await handler.handle(new BootstrapStartedEvent(), context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('No bootstrap steps configured. Marking bootstrap complete.')
      )
    ).toBe(true);
    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(BootstrapCompletedEvent);
    expect(enqueued.success).toBe(true);
  });

  it('handles bootstrap start with steps', async () => {
    const handler = new BootstrapEventHandler([new SuccessStep()]);
    const { context, inputQueues } = makeContext();

    await handler.handle(new BootstrapStartedEvent(), context);

    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(BootstrapStepRequestedEvent);
    expect(enqueued.stepIndex).toBe(0);
  });

  it('executes a bootstrap step and enqueues completion', async () => {
    const handler = new BootstrapEventHandler([new SuccessStep()]);
    const { context, inputQueues } = makeContext();
    await handler.handle(new BootstrapStartedEvent(), context);
    inputQueues.enqueueInternalSystemEvent.mockClear();

    await handler.handle(new BootstrapStepRequestedEvent(0), context);

    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(BootstrapStepCompletedEvent);
    expect(enqueued.success).toBe(true);
  });

  it('handles bootstrap step failure', async () => {
    const handler = new BootstrapEventHandler([new FailureStep()]);
    const { context, inputQueues } = makeContext();
    await handler.handle(new BootstrapStartedEvent(), context);
    inputQueues.enqueueInternalSystemEvent.mockClear();

    await handler.handle(new BootstrapStepRequestedEvent(0), context);

    const events = inputQueues.enqueueInternalSystemEvent.mock.calls.map(([evt]: [unknown]) => evt);
    const errorEvent = events.find((evt: any) => evt instanceof AgentErrorEvent);
    const completionEvent = events.find((evt: any) => evt instanceof BootstrapStepCompletedEvent);
    expect(errorEvent).toBeInstanceOf(AgentErrorEvent);
    expect(completionEvent).toBeInstanceOf(BootstrapStepCompletedEvent);
    expect(completionEvent.success).toBe(false);
  });

  it('progresses to next step on completion', async () => {
    const handler = new BootstrapEventHandler([new SuccessStep(), new SuccessStep()]);
    const { context, inputQueues } = makeContext();
    await handler.handle(new BootstrapStartedEvent(), context);
    inputQueues.enqueueInternalSystemEvent.mockClear();

    await handler.handle(new BootstrapStepCompletedEvent(0, 'SuccessStep', true), context);

    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(BootstrapStepRequestedEvent);
    expect(enqueued.stepIndex).toBe(1);
  });

  it('completes bootstrap and emits ready event', async () => {
    const handler = new BootstrapEventHandler([new SuccessStep()]);
    const { context, inputQueues } = makeContext();

    await handler.handle(new BootstrapCompletedEvent(true), context);

    expect(inputQueues.enqueueInternalSystemEvent).toHaveBeenCalledTimes(1);
    const enqueued = inputQueues.enqueueInternalSystemEvent.mock.calls[0][0];
    expect(enqueued).toBeInstanceOf(AgentReadyEvent);
  });

  it('logs warning for unexpected event types', async () => {
    const handler = new BootstrapEventHandler([]);
    const { context } = makeContext();

    await handler.handle({} as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('BootstrapEventHandler received unexpected event type')
      )
    ).toBe(true);
  });
});
