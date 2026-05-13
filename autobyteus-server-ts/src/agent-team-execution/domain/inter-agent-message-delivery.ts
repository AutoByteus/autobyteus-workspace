import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TeamMemberSelector } from "./team-run-member-identity.js";

export interface InterAgentMessageDeliveryRequest {
  senderRunId: string;
  senderSelector?: TeamMemberSelector | null;
  senderMemberName?: string | null;
  senderPath?: string[] | null;
  senderRouteKey?: string | null;
  teamRunId: string;
  recipientSelector: TeamMemberSelector;
  recipientMemberName?: string | null;
  recipientPath?: string[] | null;
  recipientRouteKey?: string | null;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
  parentCommunicationMessageId?: string | null;
  recipientInputMessageId?: string | null;
  recipientInputDedupeKey?: string | null;
}

export type InterAgentMessageDeliveryHandler = (
  request: InterAgentMessageDeliveryRequest,
) => Promise<AgentOperationResult>;
