import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GenericEventHandler } from '../../../../src/agent/handlers/generic-event-handler.js';
import { GenericEvent, UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
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

describe('GenericEventHandler', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('handles a known generic event type', async () => {
    const handler = new GenericEventHandler();
    const context = makeContext();
    const payload = { data: 'some_data' };
    const event = new GenericEvent(payload, 'example_custom_generic_event');

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Agent 'agent-1' handling GenericEvent with type_name: 'example_custom_generic_event'. Payload: {\"data\":\"some_data\"}"
        )
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Handling specific generic event 'example_custom_generic_event' for agent 'agent-1'."
        )
      )
    ).toBe(true);
    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) => String(msg).includes('unhandled type_name'))
    ).toBe(false);
  });

  it('handles another known generic event type', async () => {
    const handler = new GenericEventHandler();
    const context = makeContext();
    const payload = { key: 'value' };
    const event = new GenericEvent(payload, 'another_custom_event');

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Agent 'agent-1' handling GenericEvent with type_name: 'another_custom_event'. Payload: {\"key\":\"value\"}"
        )
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes("Handling specific generic event 'another_custom_event' for agent 'agent-1'.")
      )
    ).toBe(true);
    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) => String(msg).includes('unhandled type_name'))
    ).toBe(false);
  });

  it('handles an unknown generic event type', async () => {
    const handler = new GenericEventHandler();
    const context = makeContext();
    const payload = { info: 'unknown_info' };
    const event = new GenericEvent(payload, 'some_unknown_event_type');

    await handler.handle(event, context);

    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Agent 'agent-1' handling GenericEvent with type_name: 'some_unknown_event_type'. Payload: {\"info\":\"unknown_info\"}"
        )
      )
    ).toBe(true);
    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes(
          "Agent 'agent-1' received GenericEvent with unhandled type_name: 'some_unknown_event_type'."
        )
      )
    ).toBe(true);
  });

  it('skips non-generic events', async () => {
    const handler = new GenericEventHandler();
    const context = makeContext();
    const event = new UserMessageReceivedEvent(new AgentInputUserMessage('hello'));

    await handler.handle(event as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('GenericEventHandler received a non-GenericEvent: UserMessageReceivedEvent. Skipping.')
      )
    ).toBe(true);
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) => String(msg).includes('handling GenericEvent with type_name'))
    ).toBe(false);
  });

  it('skips unrelated events', async () => {
    class NonGenericTestEvent {}
    const handler = new GenericEventHandler();
    const context = makeContext();
    const event = new NonGenericTestEvent();

    await handler.handle(event as any, context);

    expect(
      warnSpy.mock.calls.some(([msg]: [unknown]) =>
        String(msg).includes('GenericEventHandler received a non-GenericEvent: NonGenericTestEvent. Skipping.')
      )
    ).toBe(true);
  });

  it('logs initialization', () => {
    new GenericEventHandler();
    expect(
      infoSpy.mock.calls.some(([msg]: [unknown]) => String(msg).includes('GenericEventHandler initialized.'))
    ).toBe(true);
  });
});
