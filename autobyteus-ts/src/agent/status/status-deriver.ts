import { AgentStatus } from './status-enum.js';
import {
  AgentReadyEvent,
  AgentStoppedEvent,
  AgentErrorEvent,
  AgentIdleEvent,
  ShutdownRequestedEvent,
  BootstrapStartedEvent,
  BootstrapCompletedEvent,
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  LLMUserMessageReadyEvent,
  LLMCompleteResponseReceivedEvent,
  PendingToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ExecuteToolInvocationEvent,
  ToolResultEvent,
  BaseEvent
} from '../events/agent-events.js';
import type { AgentContextLike } from '../context/agent-context-like.js';

export class AgentStatusDeriver {
  private currentStatusValue: AgentStatus;

  constructor(initialStatus: AgentStatus = AgentStatus.UNINITIALIZED) {
    this.currentStatusValue = initialStatus;
    console.debug(`AgentStatusDeriver initialized with status '${initialStatus}'.`);
  }

  get currentStatus(): AgentStatus {
    return this.currentStatusValue;
  }

  apply(event: BaseEvent, context: AgentContextLike | null = null): [AgentStatus, AgentStatus] {
    const oldStatus = this.currentStatusValue;
    const newStatus = this.reduce(event, oldStatus, context);
    this.currentStatusValue = newStatus;
    return [oldStatus, newStatus];
  }

  private reduce(event: BaseEvent, currentStatus: AgentStatus, context: AgentContextLike | null): AgentStatus {
    if (event instanceof BootstrapStartedEvent) {
      return AgentStatus.BOOTSTRAPPING;
    }
    if (event instanceof BootstrapCompletedEvent) {
      return currentStatus;
    }
    if (event instanceof AgentReadyEvent) {
      return AgentStatus.IDLE;
    }
    if (event instanceof AgentIdleEvent) {
      return AgentStatus.IDLE;
    }
    if (event instanceof ShutdownRequestedEvent) {
      if (currentStatus === AgentStatus.ERROR) {
        return currentStatus;
      }
      return AgentStatus.SHUTTING_DOWN;
    }
    if (event instanceof AgentStoppedEvent) {
      if (currentStatus === AgentStatus.ERROR) {
        return AgentStatus.ERROR;
      }
      return AgentStatus.SHUTDOWN_COMPLETE;
    }
    if (event instanceof AgentErrorEvent) {
      return AgentStatus.ERROR;
    }

    if (event instanceof UserMessageReceivedEvent || event instanceof InterAgentMessageReceivedEvent) {
      return AgentStatus.PROCESSING_USER_INPUT;
    }
    if (event instanceof LLMUserMessageReadyEvent) {
      if (currentStatus === AgentStatus.AWAITING_LLM_RESPONSE || currentStatus === AgentStatus.ERROR) {
        return currentStatus;
      }
      return AgentStatus.AWAITING_LLM_RESPONSE;
    }
    if (event instanceof LLMCompleteResponseReceivedEvent) {
      if (currentStatus !== AgentStatus.AWAITING_LLM_RESPONSE) {
        return currentStatus;
      }
      return AgentStatus.ANALYZING_LLM_RESPONSE;
    }

    if (event instanceof PendingToolInvocationEvent) {
      if (context && context.autoExecuteTools === false) {
        return AgentStatus.AWAITING_TOOL_APPROVAL;
      }
      return AgentStatus.EXECUTING_TOOL;
    }
    if (event instanceof ExecuteToolInvocationEvent) {
      return AgentStatus.EXECUTING_TOOL;
    }
    if (event instanceof ToolExecutionApprovalEvent) {
      if (event.isApproved) {
        return AgentStatus.EXECUTING_TOOL;
      }
      return AgentStatus.TOOL_DENIED;
    }
    if (event instanceof ToolResultEvent) {
      if (currentStatus !== AgentStatus.EXECUTING_TOOL) {
        return currentStatus;
      }
      return AgentStatus.PROCESSING_TOOL_RESULT;
    }

    return currentStatus;
  }
}
