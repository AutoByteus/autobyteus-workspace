import type {
  BaseEvent,
  InterAgentMessageReceivedEvent,
  LifecycleEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import type { PostToolApprovalResult } from '../tool-approval-result.js';
import type { PostToolResultResult } from '../tool-result-posting.js';
import type { InboxLane } from './inbox-queue-store.js';

export type TurnStartEventResult =
  | { accepted: true; code: 'turn_started'; turnId: string }
  | { accepted: false; code: 'active_turn_exists' | 'runtime_stopping'; activeTurnId?: string; message: string };

export type RuntimeLifecycleEventResult = {
  accepted: true;
  code: 'lifecycle_applied' | 'shutdown_requested';
  stopRequested?: boolean;
};

export type AgentEventProcessorResult =
  | TurnStartEventResult
  | RuntimeLifecycleEventResult
  | PostToolApprovalResult
  | PostToolResultResult;

export type AwaitableCompletion = {
  resolve: (result: AgentEventProcessorResult) => void;
  reject: (error: unknown) => void;
};

export type AgentEventInboxEntry<E extends BaseEvent = BaseEvent> = {
  entryId: string;
  lane: InboxLane;
  event: E;
  awaitable?: AwaitableCompletion;
};

export type TurnStartRuntimeEvent = UserMessageReceivedEvent | InterAgentMessageReceivedEvent;
export type ActiveTurnRuntimeEvent = ToolExecutionApprovalEvent | ToolResultEvent;
export type RuntimeLifecycleInputEvent = LifecycleEvent;

export type TurnStartEventInboxEntry = AgentEventInboxEntry<TurnStartRuntimeEvent> & { lane: 'turn_start' };
export type RuntimeLifecycleEventInboxEntry = AgentEventInboxEntry<RuntimeLifecycleInputEvent> & {
  lane: 'runtime_lifecycle';
};
export type ActiveTurnEventInboxEntry = AgentEventInboxEntry<ActiveTurnRuntimeEvent> & { lane: 'active_turn' };

export type AgentEventInboxCandidateSnapshot = Record<InboxLane, AgentEventInboxEntry[]>;
