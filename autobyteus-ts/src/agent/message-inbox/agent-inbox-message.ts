import type {
  InterAgentMessageReceivedEvent,
  LifecycleEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import type { ToolApprovalInputMessage, PostToolApprovalResult } from '../tool-approval-command.js';
import type { ToolResultInputMessage, PostToolResultResult } from '../tool-result-command.js';
import type { InboxLane } from './inbox-queue-store.js';

export type TurnStartMessageResult =
  | { accepted: true; code: 'turn_started'; turnId: string }
  | { accepted: false; code: 'active_turn_exists' | 'runtime_stopping'; activeTurnId?: string; message: string };

export type RuntimeLifecycleMessageResult = {
  accepted: true;
  code: 'lifecycle_applied' | 'shutdown_requested';
  stopRequested?: boolean;
};

export type AgentMessageHandlerResult =
  | TurnStartMessageResult
  | RuntimeLifecycleMessageResult
  | PostToolApprovalResult
  | PostToolResultResult;

export type AwaitableCompletion = {
  resolve: (result: AgentMessageHandlerResult) => void;
  reject: (error: unknown) => void;
};

export type AgentInboxMessageBase = {
  messageId: string;
  lane: InboxLane;
  awaitable?: AwaitableCompletion;
};

export type UserInboxMessage = AgentInboxMessageBase & {
  kind: 'user_message';
  lane: 'turn_start';
  event: UserMessageReceivedEvent;
};

export type InterAgentInboxMessage = AgentInboxMessageBase & {
  kind: 'inter_agent_message';
  lane: 'turn_start';
  event: InterAgentMessageReceivedEvent;
};

export type RuntimeLifecycleInboxMessage = AgentInboxMessageBase & {
  kind: 'runtime_lifecycle';
  lane: 'runtime_lifecycle';
  event: LifecycleEvent;
};

export type ToolApprovalInboxMessage = AgentInboxMessageBase & {
  kind: 'tool_approval';
  lane: 'active_turn';
  input: ToolApprovalInputMessage;
};

export type ToolResultInboxMessage = AgentInboxMessageBase & {
  kind: 'tool_result';
  lane: 'active_turn';
  input: ToolResultInputMessage;
};

export type TurnStartInboxMessage = UserInboxMessage | InterAgentInboxMessage;
export type ActiveTurnInboxMessage = ToolApprovalInboxMessage | ToolResultInboxMessage;
export type AgentInboxMessage = TurnStartInboxMessage | RuntimeLifecycleInboxMessage | ActiveTurnInboxMessage;
export type AgentInboxCandidateSnapshot = Record<InboxLane, AgentInboxMessage[]>;
