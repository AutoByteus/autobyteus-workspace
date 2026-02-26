import { BaseAgentTeamEvent } from '../events/agent-team-events.js';
import { BaseAgentTeamEventHandler } from './base-agent-team-event-handler.js';

type AgentTeamEventClass<T extends BaseAgentTeamEvent = BaseAgentTeamEvent> = new (...args: any[]) => T;

export class AgentTeamEventHandlerRegistry {
  private handlers: Map<AgentTeamEventClass, BaseAgentTeamEventHandler>;

  constructor() {
    this.handlers = new Map();
    console.info('AgentTeamEventHandlerRegistry initialized.');
  }

  register(eventClass: AgentTeamEventClass, handlerInstance: BaseAgentTeamEventHandler): void {
    if (typeof eventClass !== 'function' || !(eventClass.prototype instanceof BaseAgentTeamEvent)) {
      throw new TypeError('Can only register handlers for BaseAgentTeamEvent subclasses.');
    }

    this.handlers.set(eventClass, handlerInstance);
    console.info(
      `Handler '${handlerInstance.constructor.name}' registered for event '${eventClass.name}'.`
    );
  }

  getHandler(eventClass: AgentTeamEventClass): BaseAgentTeamEventHandler | undefined {
    return this.handlers.get(eventClass);
  }
}
