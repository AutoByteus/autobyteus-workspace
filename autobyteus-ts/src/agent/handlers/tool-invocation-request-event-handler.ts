import { AgentEventHandler } from './base-event-handler.js';
import {
  PendingToolInvocationEvent,
  ExecuteToolInvocationEvent,
  BaseEvent
} from '../events/agent-events.js';
import { buildToolLifecyclePayloadFromInvocation } from './tool-lifecycle-payload.js';
import type { AgentContext } from '../context/agent-context.js';

export class ToolInvocationRequestEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('ToolInvocationRequestEventHandler initialized.');
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof PendingToolInvocationEvent)) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(
        `ToolInvocationRequestEventHandler received non-PendingToolInvocationEvent: ${eventType}. Skipping.`
      );
      return;
    }

    const toolInvocation = event.toolInvocation;
    const agentId = context.agentId;
    const notifier = context.statusManager?.notifier;

    if (!context.autoExecuteTools) {
      if (!notifier) {
        console.error(
          `Agent '${agentId}': Notifier is required for manual approval flow but unavailable.`
        );
        return;
      }

      context.storePendingToolInvocation(toolInvocation);
      if (notifier.notifyAgentToolApprovalRequested) {
        try {
          notifier.notifyAgentToolApprovalRequested({
            ...buildToolLifecyclePayloadFromInvocation(agentId, toolInvocation),
            arguments: toolInvocation.arguments
          });
        } catch (error) {
          console.error(`Agent '${agentId}': Error emitting tool approval requested event: ${error}`);
        }
      }
      return;
    }

    await context.inputEventQueues.enqueueInternalSystemEvent(
      new ExecuteToolInvocationEvent(toolInvocation)
    );
  }
}
