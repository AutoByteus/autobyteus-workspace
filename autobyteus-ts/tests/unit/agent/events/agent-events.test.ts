import { describe, it, expect } from 'vitest';
import {
  AgentErrorEvent,
  UserMessageReceivedEvent,
  ToolResultEvent,
  GenericEvent,
  LLMCompleteResponseReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';


describe('Agent events', () => {
  it('stores error event data', () => {
    const event = new AgentErrorEvent('boom', 'details');
    expect(event.errorMessage).toBe('boom');
    expect(event.exceptionDetails).toBe('details');
  });

  it('stores user message payload', () => {
    const msg = new AgentInputUserMessage('hello');
    const event = new UserMessageReceivedEvent(msg);
    expect(event.agentInputUserMessage).toBe(msg);
  });

  it('stores tool result data', () => {
    const event = new ToolResultEvent('tool', { ok: true }, 'inv-1', undefined, { arg: 1 });
    expect(event.toolName).toBe('tool');
    expect(event.result).toEqual({ ok: true });
    expect(event.toolInvocationId).toBe('inv-1');
    expect(event.toolArgs).toEqual({ arg: 1 });
  });

  it('stores generic event data', () => {
    const event = new GenericEvent({ value: 1 }, 'custom');
    expect(event.payload).toEqual({ value: 1 });
    expect(event.typeName).toBe('custom');
  });

  it('stores completion turn id when provided', () => {
    const event = new LLMCompleteResponseReceivedEvent(
      new CompleteResponse({ content: 'done' }),
      false,
      'turn_123'
    );
    expect(event.turnId).toBe('turn_123');
    expect(event.isError).toBe(false);
  });
});
