import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryRequest } from "../domain/inter-agent-message-delivery.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../domain/team-run-event.js";
import type { AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import type { TeamStatusPayload } from "../domain/team-status-payload.js";

export interface TeamManager {
  hasActiveMembers(): boolean;
  getStatusSnapshot(): TeamStatusPayload;
  getMemberStatusSnapshots(): AgentStatusPayload[];
  postMessage(
    message: AgentInputUserMessage,
    targetMemberName: string,
  ): Promise<AgentOperationResult>;
  deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult>;
  approveToolInvocation(
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId?: string | null,
  ): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe;
}
