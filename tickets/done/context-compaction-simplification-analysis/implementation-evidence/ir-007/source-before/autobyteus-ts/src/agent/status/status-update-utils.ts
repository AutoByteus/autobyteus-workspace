import { effectiveAgentStatus } from './status-deriver.js';
import { AgentStatus } from './status-enum.js';
import {
  AgentErrorEvent,
  AgentInterruptRequestedEvent,
  AgentTurnInterruptedEvent,
  AgentTurnRecoveredEvent,
  AgentRuntimeRecoveredEvent,
  PendingToolInvocationEvent,
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
    } else if (event instanceof ToolExecutionApprovalEvent) {
      const pending = context.state.pendingToolApprovals[event.toolInvocationId];
      toolName = pending ? pending.name : 'unknown_tool';
    }
    if (toolName) {
      return { tool_name: toolName };
    }
  }

  if (newStatus === AgentStatus.INTERRUPTING && event instanceof AgentInterruptRequestedEvent) {
    return { turn_id: event.turnId, reason: event.reason };
  }

  if (newStatus === AgentStatus.IDLE && event instanceof AgentTurnInterruptedEvent) {
    return { turn_id: event.turnId, reason: event.reason, interrupted: true };
  }

  if (newStatus === AgentStatus.IDLE && event instanceof AgentTurnRecoveredEvent) {
    return { turn_id: event.turnId, reason: event.reason, recovered: true, recovered_tool_invocation_ids: event.recoveredToolInvocationIds };
  }

  if (newStatus === AgentStatus.IDLE && event instanceof AgentRuntimeRecoveredEvent) {
    return { reason: event.reason, recovered: true };
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

  const [oldPhase, newPhase] = context.state.statusDeriver.apply(event, context);
  const oldStatus = context.currentStatus;
  const recovery = context.state.memoryManager?.getCompactionRecovery() ?? null;
  const newStatus = effectiveAgentStatus(newPhase, recovery);
  context.currentStatus = newStatus;
  const additionalData = buildStatusUpdateData(event, context, newPhase);
  if (context.statusManager) {
    if (oldPhase !== newPhase) await context.statusManager.executeLifecycleProcessors(oldPhase, newPhase, additionalData);
    await context.statusManager.emit_status_update(oldStatus, newStatus,
      { ...additionalData, recoverableBlock: recovery }, false);
  }
  return [oldStatus, newStatus];
}

/** A gate-only projection must never invoke phase lifecycle processors. */
export function publishCompactionRecoveryStatus(context: AgentContext): void {
  const recovery = context.state.memoryManager?.getCompactionRecovery() ?? null;
  const phase = context.state.statusDeriver?.currentStatus ?? context.currentStatus;
  const previous = context.currentStatus;
  const effective = effectiveAgentStatus(phase, recovery);
  context.currentStatus = effective;
  context.statusManager?.notifier.notifyStatusUpdated(effective, previous, { recoverableBlock: recovery });
}
