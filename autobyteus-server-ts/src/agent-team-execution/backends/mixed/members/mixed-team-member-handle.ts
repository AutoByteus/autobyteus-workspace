import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentStatusPayload } from "../../../../agent-execution/domain/agent-status-payload.js";
import type { InterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";
import type { TeamMemberSelector } from "../../../domain/team-run-member-identity.js";
import type { TeamRunEventUnsubscribe } from "../../../domain/team-run-event.js";
import type { MixedTeamMemberContext } from "../mixed-team-run-context.js";

export interface MixedTeamMemberHandle {
  readonly context: MixedTeamMemberContext;
  isActive(): boolean;
  getStatusSnapshot(): AgentStatusPayload;
  postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult>;
  deliverInterMemberMessage(request: InterAgentMessageDeliveryRequest): Promise<AgentOperationResult>;
  approveToolInvocation(
    target: TeamMemberSelector | null,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
  dispose(): void;
}

export type MixedTeamEventPublish = (event: import("../../../domain/team-run-event.js").TeamRunEvent) => void;
export type MixedTeamStatusChange = () => void;
export type MixedTeamUnsubscribe = TeamRunEventUnsubscribe;
