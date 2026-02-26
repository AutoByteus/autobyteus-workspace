import type { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import type { InterAgentMessage } from '../message/inter-agent-message.js';
import type { ToolInvocation } from '../tool-invocation.js';
import type { LLMUserMessage } from '../../llm/user-message.js';
import type { CompleteResponse } from '../../llm/utils/response-types.js';

export class BaseEvent {}

export class LifecycleEvent extends BaseEvent {}

export class AgentProcessingEvent extends BaseEvent {}

export class AgentOperationalEvent extends AgentProcessingEvent {}

export class AgentReadyEvent extends LifecycleEvent {}

export class AgentStoppedEvent extends LifecycleEvent {}

export class AgentErrorEvent extends LifecycleEvent {
  errorMessage: string;
  exceptionDetails?: string;

  constructor(errorMessage: string, exceptionDetails?: string) {
    super();
    this.errorMessage = errorMessage;
    this.exceptionDetails = exceptionDetails;
  }
}

export class AgentIdleEvent extends LifecycleEvent {}

export class ShutdownRequestedEvent extends LifecycleEvent {}

export class BootstrapStartedEvent extends LifecycleEvent {}

export class BootstrapStepRequestedEvent extends LifecycleEvent {
  stepIndex: number;

  constructor(stepIndex: number) {
    super();
    this.stepIndex = stepIndex;
  }
}

export class BootstrapStepCompletedEvent extends LifecycleEvent {
  stepIndex: number;
  stepName: string;
  success: boolean;
  errorMessage?: string;

  constructor(stepIndex: number, stepName: string, success: boolean, errorMessage?: string) {
    super();
    this.stepIndex = stepIndex;
    this.stepName = stepName;
    this.success = success;
    this.errorMessage = errorMessage;
  }
}

export class BootstrapCompletedEvent extends LifecycleEvent {
  success: boolean;
  errorMessage?: string;

  constructor(success: boolean, errorMessage?: string) {
    super();
    this.success = success;
    this.errorMessage = errorMessage;
  }
}

export class UserMessageReceivedEvent extends AgentOperationalEvent {
  agentInputUserMessage: AgentInputUserMessage;

  constructor(agentInputUserMessage: AgentInputUserMessage) {
    super();
    this.agentInputUserMessage = agentInputUserMessage;
  }
}

export class InterAgentMessageReceivedEvent extends AgentOperationalEvent {
  interAgentMessage: InterAgentMessage;

  constructor(interAgentMessage: InterAgentMessage) {
    super();
    this.interAgentMessage = interAgentMessage;
  }
}

export class LLMUserMessageReadyEvent extends AgentOperationalEvent {
  llmUserMessage: LLMUserMessage;

  constructor(llmUserMessage: LLMUserMessage) {
    super();
    this.llmUserMessage = llmUserMessage;
  }
}

export class LLMCompleteResponseReceivedEvent extends AgentOperationalEvent {
  completeResponse: CompleteResponse;
  isError: boolean;
  turnId: string | null;

  constructor(
    completeResponse: CompleteResponse,
    isError: boolean = false,
    turnId: string | null = null,
  ) {
    super();
    this.completeResponse = completeResponse;
    this.isError = isError;
    this.turnId = turnId;
  }
}

export class PendingToolInvocationEvent extends AgentOperationalEvent {
  toolInvocation: ToolInvocation;

  constructor(toolInvocation: ToolInvocation) {
    super();
    this.toolInvocation = toolInvocation;
  }
}

export class ToolResultEvent extends AgentOperationalEvent {
  toolName: string;
  result: unknown;
  toolInvocationId?: string;
  error?: string;
  toolArgs?: Record<string, unknown>;
  turnId?: string;
  isDenied: boolean;

  constructor(
    toolName: string,
    result: unknown,
    toolInvocationId?: string,
    error?: string,
    toolArgs?: Record<string, unknown>,
    turnId?: string,
    isDenied: boolean = false
  ) {
    super();
    this.toolName = toolName;
    this.result = result;
    this.toolInvocationId = toolInvocationId;
    this.error = error;
    this.toolArgs = toolArgs;
    this.turnId = turnId;
    this.isDenied = isDenied;
  }
}

export class ToolExecutionApprovalEvent extends AgentOperationalEvent {
  toolInvocationId: string;
  isApproved: boolean;
  reason?: string;

  constructor(toolInvocationId: string, isApproved: boolean, reason?: string) {
    super();
    this.toolInvocationId = toolInvocationId;
    this.isApproved = isApproved;
    this.reason = reason;
  }
}

export class ExecuteToolInvocationEvent extends AgentOperationalEvent {
  toolInvocation: ToolInvocation;

  constructor(toolInvocation: ToolInvocation) {
    super();
    this.toolInvocation = toolInvocation;
  }
}

export class GenericEvent extends AgentOperationalEvent {
  payload: Record<string, unknown>;
  typeName: string;

  constructor(payload: Record<string, unknown>, typeName: string) {
    super();
    this.payload = payload;
    this.typeName = typeName;
  }
}
