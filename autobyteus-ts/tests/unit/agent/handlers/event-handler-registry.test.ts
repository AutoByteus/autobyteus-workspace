import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandlerRegistry } from '../../../../src/agent/handlers/event-handler-registry.js';
import { AgentEventHandler } from '../../../../src/agent/handlers/base-event-handler.js';
import { BaseEvent, UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

class DummyEventHandler extends AgentEventHandler {
  async handle(_event: BaseEvent, _context: AgentContext): Promise<void> {
    return;
  }
}

describe('EventHandlerRegistry', () => {
  let registry: EventHandlerRegistry;

  beforeEach(() => {
    registry = new EventHandlerRegistry();
  });

  it('initializes empty', () => {
    expect(registry.getAllRegisteredEventTypes()).toEqual([]);
  });

  it('registers and retrieves a handler', () => {
    const handler = new DummyEventHandler();
    registry.register(UserMessageReceivedEvent, handler);

    expect(registry.getHandler(UserMessageReceivedEvent)).toBe(handler);
    expect(registry.getAllRegisteredEventTypes()).toEqual([UserMessageReceivedEvent]);
  });

  it('throws when overwriting a handler registration', () => {
    registry.register(UserMessageReceivedEvent, new DummyEventHandler());

    expect(() => registry.register(UserMessageReceivedEvent, new DummyEventHandler())).toThrow(
      "Handler already registered for event class 'UserMessageReceivedEvent'."
    );
  });

  it('returns null when handler is not found', () => {
    expect(registry.getHandler(UserMessageReceivedEvent)).toBeNull();
  });

  it('throws when event class is not a type', () => {
    const handler = new DummyEventHandler();
    const eventInstance = new UserMessageReceivedEvent({} as any);

    expect(() => registry.register(eventInstance as any, handler)).toThrow(
      "Cannot register handler: 'event_class' must be a subclass of BaseEvent"
    );
  });

  it('throws when event class does not extend BaseEvent', () => {
    class NotAnEvent {}
    const handler = new DummyEventHandler();

    expect(() => registry.register(NotAnEvent as any, handler)).toThrow(
      "Cannot register handler: 'event_class' must be a subclass of BaseEvent"
    );
  });

  it('throws when handler is not an AgentEventHandler', () => {
    class NotAHandler {}

    expect(() => registry.register(UserMessageReceivedEvent, new NotAHandler() as any)).toThrow(
      "Cannot register handler: 'handler_instance' must be an instance of AgentEventHandler"
    );
  });

  it('renders a readable string representation', () => {
    expect(registry.toString()).toBe('<EventHandlerRegistry registered_event_types=[]>');

    registry.register(UserMessageReceivedEvent, new DummyEventHandler());
    expect(registry.toString()).toBe(
      "<EventHandlerRegistry registered_event_types=['UserMessageReceivedEvent']>"
    );
  });
});
