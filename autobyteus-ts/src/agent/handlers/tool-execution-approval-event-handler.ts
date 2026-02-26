import { AgentEventHandler } from './base-event-handler.js';
import {
  ToolExecutionApprovalEvent,
  ExecuteToolInvocationEvent,
  ToolResultEvent,
  BaseEvent
} from '../events/agent-events.js';
import { buildToolLifecyclePayloadFromInvocation } from './tool-lifecycle-payload.js';
import type { AgentContext } from '../context/agent-context.js';

export class ToolExecutionApprovalEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('ToolExecutionApprovalEventHandler initialized.');
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof ToolExecutionApprovalEvent)) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(
        `ToolExecutionApprovalEventHandler received non-ToolExecutionApprovalEvent: ${eventType}. Skipping.`
      );
      return;
    }

    const retrievedInvocation = context.state.retrievePendingToolInvocation(event.toolInvocationId);
    if (!retrievedInvocation) {
      console.warn(
        `Agent '${context.agentId}': No pending tool invocation found for ID '${event.toolInvocationId}'. Ignoring stale approval.`
      );
      return;
    }

    const notifier = context.statusManager?.notifier;

    if (event.isApproved) {
      if (notifier?.notifyAgentToolApproved) {
        try {
          notifier.notifyAgentToolApproved({
            ...buildToolLifecyclePayloadFromInvocation(context.agentId, retrievedInvocation),
            reason: event.reason ?? null
          });
        } catch (error) {
          console.error(`Agent '${context.agentId}': Error notifying tool approved event: ${error}`);
        }
      }

      await context.inputEventQueues.enqueueInternalSystemEvent(
        new ExecuteToolInvocationEvent(retrievedInvocation)
      );
      return;
    }

    const denialReason = event.reason ?? 'Tool execution was denied by user/system.';

    if (notifier?.notifyAgentToolDenied) {
      try {
        notifier.notifyAgentToolDenied({
          ...buildToolLifecyclePayloadFromInvocation(context.agentId, retrievedInvocation),
          reason: denialReason,
          error: denialReason
        });
      } catch (error) {
        console.error(`Agent '${context.agentId}': Error notifying tool denied event: ${error}`);
      }
    }

    const resultEvent = new ToolResultEvent(
      retrievedInvocation.name,
      null,
      retrievedInvocation.id,
      denialReason,
      retrievedInvocation.arguments,
      retrievedInvocation.turnId ?? context.state.activeTurnId ?? undefined,
      true
    );
    await context.inputEventQueues.enqueueToolResult(resultEvent);
  }
}
