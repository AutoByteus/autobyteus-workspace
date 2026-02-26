import type { AgentInputUserMessage } from '../../agent/message/agent-input-user-message.js';

export class BaseAgentTeamEvent {}

export class LifecycleAgentTeamEvent extends BaseAgentTeamEvent {}

export class OperationalAgentTeamEvent extends BaseAgentTeamEvent {}

export class AgentTeamBootstrapStartedEvent extends LifecycleAgentTeamEvent {}

export class AgentTeamReadyEvent extends LifecycleAgentTeamEvent {}

export class AgentTeamIdleEvent extends LifecycleAgentTeamEvent {}

export class AgentTeamShutdownRequestedEvent extends LifecycleAgentTeamEvent {}

export class AgentTeamStoppedEvent extends LifecycleAgentTeamEvent {}

export class AgentTeamErrorEvent extends LifecycleAgentTeamEvent {
  errorMessage: string;
  exceptionDetails?: string;

  constructor(errorMessage: string, exceptionDetails?: string) {
    super();
    this.errorMessage = errorMessage;
    this.exceptionDetails = exceptionDetails;
  }
}

export class ProcessUserMessageEvent extends OperationalAgentTeamEvent {
  userMessage: AgentInputUserMessage;
  targetAgentName: string;

  constructor(userMessage: AgentInputUserMessage, targetAgentName: string) {
    super();
    this.userMessage = userMessage;
    this.targetAgentName = targetAgentName;
  }
}

export class InterAgentMessageRequestEvent extends OperationalAgentTeamEvent {
  senderAgentId: string;
  recipientName: string;
  content: string;
  messageType: string;

  constructor(senderAgentId: string, recipientName: string, content: string, messageType: string) {
    super();
    this.senderAgentId = senderAgentId;
    this.recipientName = recipientName;
    this.content = content;
    this.messageType = messageType;
  }
}

export class ToolApprovalTeamEvent extends OperationalAgentTeamEvent {
  agentName: string;
  toolInvocationId: string;
  isApproved: boolean;
  reason?: string;

  constructor(agentName: string, toolInvocationId: string, isApproved: boolean, reason?: string) {
    super();
    this.agentName = agentName;
    this.toolInvocationId = toolInvocationId;
    this.isApproved = isApproved;
    this.reason = reason;
  }
}
