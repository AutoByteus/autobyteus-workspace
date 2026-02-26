import { AgentStatus } from '../status/status-enum.js';
import { applyEventAndDeriveStatus } from '../status/status-update-utils.js';
import {
  BaseEvent,
  AgentErrorEvent,
  AgentIdleEvent,
  LLMCompleteResponseReceivedEvent
} from './agent-events.js';
import type { AgentContext } from '../context/agent-context.js';
import type { EventHandlerRegistry } from '../handlers/event-handler-registry.js';

export class WorkerEventDispatcher {
  private eventHandlerRegistry: EventHandlerRegistry;

  constructor(eventHandlerRegistry: EventHandlerRegistry) {
    this.eventHandlerRegistry = eventHandlerRegistry;
    console.debug('WorkerEventDispatcher initialized.');
  }

  async dispatch(event: BaseEvent, context: AgentContext): Promise<void> {
    const eventClass = event.constructor as typeof BaseEvent;
    const handler = this.eventHandlerRegistry.getHandler(eventClass as any);
    const agentId = context.agentId;

    try {
      await applyEventAndDeriveStatus(event, context);
    } catch (error) {
      console.error(`WorkerEventDispatcher '${agentId}': Status projection failed: ${error}`);
    }

    if (!handler) {
      console.warn(
        `WorkerEventDispatcher '${agentId}' (Status: ${context.currentStatus}) No handler for '${eventClass.name}'. Event: ${event}`
      );
      return;
    }

    const eventClassName = eventClass.name ?? 'UnknownEvent';
    const handlerClassName = handler.constructor?.name ?? 'UnknownHandler';

    try {
      console.debug(
        `WorkerEventDispatcher '${agentId}' (Status: ${context.currentStatus}) dispatching '${eventClassName}' to ${handlerClassName}.`
      );
      await handler.handle(event as any, context);
      console.debug(
        `WorkerEventDispatcher '${agentId}' (Status: ${context.currentStatus}) event '${eventClassName}' handled by ${handlerClassName}.`
      );
    } catch (error) {
      const errorMessage = `WorkerEventDispatcher '${agentId}' error handling '${eventClassName}' with ${handlerClassName}: ${error}`;
      console.error(errorMessage);
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new AgentErrorEvent(errorMessage, String(error))
      );
      return;
    }

    if (event instanceof LLMCompleteResponseReceivedEvent) {
      if (
        context.currentStatus === AgentStatus.ANALYZING_LLM_RESPONSE &&
        !Object.keys(context.state.pendingToolApprovals).length &&
        context.inputEventQueues.toolInvocationRequestQueue.empty()
      ) {
        await context.inputEventQueues.enqueueInternalSystemEvent(new AgentIdleEvent());
      }
    }
  }
}
