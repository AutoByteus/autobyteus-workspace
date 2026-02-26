import { AgentStatus } from './status-enum.js';
import {
  AgentErrorEvent,
  PendingToolInvocationEvent,
  ExecuteToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  BaseEvent
} from '../events/agent-events.js';
import type { AgentContext } from '../context/agent-context.js';

export function buildStatusUpdateData(
  event: BaseEvent,
  context: AgentContext,
  newStatus: AgentStatus
): Record<string, unknown> | null {
  if (newStatus === AgentStatus.PROCESSING_USER_INPUT) {
    return { trigger: event.constructor.name };
  }

  if (newStatus === AgentStatus.EXECUTING_TOOL) {
    let toolName: string | undefined;
    if (event instanceof PendingToolInvocationEvent) {
      toolName = event.toolInvocation.name;
    } else if (event instanceof ExecuteToolInvocationEvent) {
      toolName = event.toolInvocation.name;
    } else if (event instanceof ToolExecutionApprovalEvent) {
      const pending = context.state.pendingToolApprovals[event.toolInvocationId];
      toolName = pending ? pending.name : 'unknown_tool';
    }
    if (toolName) {
      return { tool_name: toolName };
    }
  }

  if (newStatus === AgentStatus.PROCESSING_TOOL_RESULT && event instanceof ToolResultEvent) {
    return { tool_name: event.toolName };
  }

  if (newStatus === AgentStatus.TOOL_DENIED && event instanceof ToolExecutionApprovalEvent) {
    const pending = context.state.pendingToolApprovals[event.toolInvocationId];
    const toolName = pending ? pending.name : 'unknown_tool';
    return { tool_name: toolName, denial_for_tool: toolName };
  }

  if (newStatus === AgentStatus.ERROR && event instanceof AgentErrorEvent) {
    return { error_message: event.errorMessage, error_details: event.exceptionDetails };
  }

  return null;
}

export async function applyEventAndDeriveStatus(
  event: BaseEvent,
  context: AgentContext
): Promise<[AgentStatus, AgentStatus]> {
  if (context.state.eventStore) {
    try {
      context.state.eventStore.append(event);
    } catch (error) {
      console.error(`Failed to append event to store: ${error}`);
    }
  }

  if (!context.state.statusDeriver) {
    return [context.currentStatus, context.currentStatus];
  }

  const [oldStatus, newStatus] = context.state.statusDeriver.apply(event, context);
  if (oldStatus !== newStatus) {
    context.currentStatus = newStatus;
    const additionalData = buildStatusUpdateData(event, context, newStatus);
    if (context.statusManager) {
      await context.statusManager.emit_status_update(oldStatus, newStatus, additionalData ?? null);
    }
  }

  return [oldStatus, newStatus];
}
