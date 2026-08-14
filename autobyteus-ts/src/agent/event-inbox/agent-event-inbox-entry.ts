import {
  BaseEvent,
  InterAgentMessageReceivedEvent,
  LifecycleEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../events/agent-events.js';
import { SenderType } from '../sender-type.js';
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

export type InboxEventHandlerResult =
  | TurnStartEventResult
  | RuntimeLifecycleEventResult
  | PostToolApprovalResult
  | PostToolResultResult;

export type AwaitableCompletion = {
  resolve: (result: InboxEventHandlerResult) => void;
  reject: (error: unknown) => void;
};

export type AgentEventInboxEntry<E extends BaseEvent = BaseEvent> = {
  entryId: string;
  lane: InboxLane;
  event: E;
  awaitable?: AwaitableCompletion;
};

export type TurnStartOrigin = 'user' | 'agent' | 'system';

export type TurnStartRuntimeEvent = UserMessageReceivedEvent | InterAgentMessageReceivedEvent;
export type ActiveTurnRuntimeEvent = ToolExecutionApprovalEvent | ToolResultEvent;
export type RuntimeLifecycleInputEvent = LifecycleEvent;

export type TurnStartEventInboxEntry = AgentEventInboxEntry<TurnStartRuntimeEvent> & {
  lane: 'turn_start';
  origin: TurnStartOrigin;
};
export type RuntimeLifecycleEventInboxEntry = AgentEventInboxEntry<RuntimeLifecycleInputEvent> & {
  lane: 'runtime_lifecycle';
};
export type ActiveTurnEventInboxEntry = AgentEventInboxEntry<ActiveTurnRuntimeEvent> & { lane: 'active_turn' };

export type AgentEventInboxCandidateSnapshot = Record<InboxLane, AgentEventInboxEntry[]>;

export const resolveTurnStartOrigin = (event: TurnStartRuntimeEvent): TurnStartOrigin => {
  if (event instanceof InterAgentMessageReceivedEvent) return 'agent';
  if (!(event instanceof UserMessageReceivedEvent)) {
    throw new TypeError('Unsupported turn-start event.');
  }
  switch (event.agentInputUserMessage.senderType) {
    case SenderType.USER:
      return 'user';
    case SenderType.AGENT:
      return 'agent';
    case SenderType.SYSTEM:
      return 'system';
    case SenderType.TOOL:
      throw new Error('TOOL input cannot be classified as an external turn start.');
  }
};
