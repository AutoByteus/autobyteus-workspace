import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

export type InterAgentMessageParticipant = Readonly<{
  kind: "agent";
  identity: CollaborationMemberExecutionIdentity;
  displayName: string;
}>;

export type InterAgentMessageDeliveryEndpoint = Readonly<{
  participant: InterAgentMessageParticipant;
}>;

export interface InterAgentMessageDeliveryIntent {
  rootTeamRunId: string;
  sender: InterAgentMessageDeliveryEndpoint;
  recipientAddress: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}

export interface ResolvedInterAgentMessageDeliveryRequest extends InterAgentMessageDeliveryIntent {
  recipient: InterAgentMessageDeliveryEndpoint;
  senderIdentity: CollaborationMemberExecutionIdentity;
  receiverIdentity: CollaborationMemberExecutionIdentity;
  parentCommunicationMessageId?: string | null;
  recipientInputMessageId?: string | null;
  recipientInputDedupeKey?: string | null;
}

export type InterAgentMessageDeliveryHandler = (
  intent: InterAgentMessageDeliveryIntent,
) => Promise<AgentOperationResult>;

export const buildDeliveryEndpointForParticipant = (
  participant: InterAgentMessageParticipant,
): InterAgentMessageDeliveryEndpoint => Object.freeze({ participant });
