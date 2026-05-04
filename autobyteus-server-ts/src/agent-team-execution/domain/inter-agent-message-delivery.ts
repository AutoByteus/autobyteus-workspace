import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

export interface InterAgentMessageDeliveryRequest {
  senderRunId: string;
  senderMemberName?: string | null;
  teamRunId: string;
  recipientMemberName: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}

export type InterAgentMessageDeliveryHandler = (
  request: InterAgentMessageDeliveryRequest,
) => Promise<AgentOperationResult>;
