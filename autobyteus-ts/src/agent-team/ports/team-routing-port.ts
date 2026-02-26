import type {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent
} from '../events/agent-team-events.js';

export type TeamRoutingDispatchResult = {
  accepted: boolean;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * TeamRoutingPort defines the core routing contract used by team runtime components.
 * Concrete routing/transport implementations live outside of core.
 */
export interface TeamRoutingPort {
  dispatchUserMessage(event: ProcessUserMessageEvent): Promise<TeamRoutingDispatchResult>;
  dispatchInterAgentMessageRequest(event: InterAgentMessageRequestEvent): Promise<TeamRoutingDispatchResult>;
  dispatchToolApproval(event: ToolApprovalTeamEvent): Promise<TeamRoutingDispatchResult>;
  dispatchControlStop(): Promise<TeamRoutingDispatchResult>;
}
