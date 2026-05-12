import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryRequest } from "../domain/inter-agent-message-delivery.js";
import type { TeamMemberSelector } from "../domain/team-run-member-identity.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../domain/team-run-event.js";

export interface TeamManager {
  hasActiveMembers(): boolean;
  postMessage(
    message: AgentInputUserMessage,
    target: TeamMemberSelector,
  ): Promise<AgentOperationResult>;
  deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult>;
  approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe;
}
