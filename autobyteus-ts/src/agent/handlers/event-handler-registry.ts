import { BaseEvent } from '../events/agent-events.js';
import { AgentEventHandler } from './base-event-handler.js';

type EventClass<T extends BaseEvent = BaseEvent> = new (...args: any[]) => T;

export class EventHandlerRegistry {
  private handlers: Map<EventClass, AgentEventHandler>;

  constructor() {
    this.handlers = new Map();
    console.info('EventHandlerRegistry initialized.');
  }

  register(eventClass: EventClass, handlerInstance: AgentEventHandler): void {
    if (typeof eventClass !== 'function' || !(eventClass.prototype instanceof BaseEvent)) {
      const msg = `Cannot register handler: 'event_class' must be a subclass of BaseEvent, got ${String(eventClass)}.`;
      console.error(msg);
      throw new TypeError(msg);
    }

    if (!(handlerInstance instanceof AgentEventHandler)) {
      const msg = `Cannot register handler: 'handler_instance' must be an instance of AgentEventHandler, got ${String(handlerInstance)}.`;
      console.error(msg);
      throw new TypeError(msg);
    }

    if (this.handlers.has(eventClass)) {
      const msg = `Handler already registered for event class '${eventClass.name}'. Overwriting is not allowed by default.`;
      console.error(msg);
      throw new Error(msg);
    }

    this.handlers.set(eventClass, handlerInstance);
    console.info(
      `Handler '${handlerInstance.constructor.name}' registered for event class '${eventClass.name}'.`
    );
  }

  getHandler(eventClass: EventClass): AgentEventHandler | null {
    if (typeof eventClass !== 'function' || !(eventClass.prototype instanceof BaseEvent)) {
      console.warn(`Attempted to get handler for invalid event_class type: ${String(eventClass)}.`);
      return null;
    }

    return this.handlers.get(eventClass) ?? null;
  }

  getAllRegisteredEventTypes(): EventClass[] {
    return Array.from(this.handlers.keys());
  }

  toString(): string {
    const registeredTypes = this.getAllRegisteredEventTypes()
      .map((eventClass) => `'${eventClass.name}'`)
      .join(', ');
    return `<EventHandlerRegistry registered_event_types=[${registeredTypes}]>`;
  }
}
