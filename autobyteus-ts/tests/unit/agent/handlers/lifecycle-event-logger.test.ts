import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LifecycleEventLogger } from '../../../../src/agent/handlers/lifecycle-event-logger.js';
import {
  AgentReadyEvent,
  AgentStoppedEvent,
  AgentErrorEvent,
  UserMessageReceivedEvent,
  LifecycleEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
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
  return new AgentContext('agent-1', config, state);
};

class UnhandledRealLifecycleEvent extends LifecycleEvent {}

describe('LifecycleEventLogger', () => {
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

  it('logs AgentReadyEvent', async () => {
    const handler = new LifecycleEventLogger();
    const context = makeContext();
    context.currentStatus = AgentStatus.IDLE;

    await handler.handle(new AgentReadyEvent(), context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Agent 'agent-1' Logged AgentReadyEvent. Current agent status: idle"
        )
      )
    ).toBe(true);
  });

  it('logs AgentStoppedEvent', async () => {
    const handler = new LifecycleEventLogger();
    const context = makeContext();
    context.currentStatus = AgentStatus.SHUTDOWN_COMPLETE;

    await handler.handle(new AgentStoppedEvent(), context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Agent 'agent-1' Logged AgentStoppedEvent. Current agent status: shutdown_complete"
        )
      )
    ).toBe(true);
  });

  it('logs AgentErrorEvent', async () => {
    const handler = new LifecycleEventLogger();
    const context = makeContext();
    context.currentStatus = AgentStatus.ERROR;
    const event = new AgentErrorEvent('A test error occurred.', 'Traceback here.');

    await handler.handle(event, context);

    const logOutput = errorSpy.mock.calls.map(([msg]: [unknown]) => String(msg)).join(' ');
    expect(logOutput).toContain("Agent 'agent-1' Logged AgentErrorEvent: A test error occurred.");
    expect(logOutput).toContain('Details: Traceback here.');
    expect(logOutput).toContain('Current agent status: error');
  });

  it('logs unhandled LifecycleEvent subclasses', async () => {
    const handler = new LifecycleEventLogger();
    const context = makeContext();
    context.currentStatus = AgentStatus.PROCESSING_USER_INPUT;
    const event = new UnhandledRealLifecycleEvent();

    await handler.handle(event, context);

    const logOutput = warnSpy.mock.calls.map(([msg]: [unknown]) => String(msg)).join(' ');
    expect(logOutput).toContain(
      "LifecycleEventLogger for agent 'agent-1' received an unhandled specific LifecycleEvent type: UnhandledRealLifecycleEvent."
    );
    expect(logOutput).toContain('Current status: processing_user_input');
  });

  it('logs non-lifecycle events', async () => {
    const handler = new LifecycleEventLogger();
    const context = makeContext();
    context.currentStatus = AgentStatus.IDLE;
    const event = new UserMessageReceivedEvent(new AgentInputUserMessage('test'));

    await handler.handle(event, context);

    const logOutput = warnSpy.mock.calls.map(([msg]: [unknown]) => String(msg)).join(' ');
    expect(logOutput).toContain(
      "LifecycleEventLogger for agent 'agent-1' received an unexpected event type: UserMessageReceivedEvent."
    );
    expect(logOutput).toContain('Current status: idle');
  });

  it('logs when status is uninitialized', async () => {
    const handler = new LifecycleEventLogger();
    const context = makeContext();
    context.currentStatus = AgentStatus.UNINITIALIZED;

    await handler.handle(new AgentReadyEvent(), context);

    const logOutput = infoSpy.mock.calls.map(([msg]: [unknown]) => String(msg)).join(' ');
    expect(logOutput).toContain("Agent 'agent-1' Logged AgentReadyEvent.");
    expect(logOutput).toContain('Current agent status: uninitialized');
  });
});
