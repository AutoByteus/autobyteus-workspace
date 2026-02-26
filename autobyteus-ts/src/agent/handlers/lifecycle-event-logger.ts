import { AgentEventHandler } from './base-event-handler.js';
import {
  AgentReadyEvent,
  AgentStoppedEvent,
  AgentErrorEvent,
  AgentIdleEvent,
  ShutdownRequestedEvent,
  LifecycleEvent,
  BaseEvent
} from '../events/agent-events.js';
import type { AgentContext } from '../context/agent-context.js';

export class LifecycleEventLogger extends AgentEventHandler {
  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    const agentId = context.agentId;
    const currentStatus = context.currentStatus ?? 'None (Status not set)';

    if (event instanceof AgentReadyEvent) {
      console.info(
        `Agent '${agentId}' Logged AgentReadyEvent. Current agent status: ${currentStatus}`
      );
    } else if (event instanceof AgentStoppedEvent) {
      console.info(
        `Agent '${agentId}' Logged AgentStoppedEvent. Current agent status: ${currentStatus}`
      );
    } else if (event instanceof AgentIdleEvent) {
      console.info(
        `Agent '${agentId}' Logged AgentIdleEvent. Current agent status: ${currentStatus}`
      );
    } else if (event instanceof ShutdownRequestedEvent) {
      console.info(
        `Agent '${agentId}' Logged ShutdownRequestedEvent. Current agent status: ${currentStatus}`
      );
    } else if (event instanceof AgentErrorEvent) {
      console.error(
        `Agent '${agentId}' Logged AgentErrorEvent: ${event.errorMessage}. ` +
          `Details: ${event.exceptionDetails}. Current agent status: ${currentStatus}`
      );
    } else if (event instanceof LifecycleEvent) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(
        `LifecycleEventLogger for agent '${agentId}' received an unhandled ` +
          `specific LifecycleEvent type: ${eventType}. Event: ${event}. ` +
          `Current status: ${currentStatus}`
      );
    } else {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(
        `LifecycleEventLogger for agent '${agentId}' received an ` +
          `unexpected event type: ${eventType}. Event: ${event}. ` +
          `Current status: ${currentStatus}`
      );
    }
  }
}
