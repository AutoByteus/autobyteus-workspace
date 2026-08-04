import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { MemberLogicalAddressContext } from "./member-logical-address-context.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";

export type InterAgentMessageParticipant = Readonly<{
  kind: "agent";
  executionAddress: TeamExecutionAddress;
  agentRunId: string;
  displayName: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId?: string | null;
  taskId?: string | null;
}>;

export type InterAgentMessageDeliveryEndpoint = Readonly<{
  participant: InterAgentMessageParticipant;
}>;

export interface InterAgentMessageDeliveryIntent {
  rootTeamRunId: string;
  callerAddressing: MemberLogicalAddressContext;
  sender: InterAgentMessageDeliveryEndpoint;
  recipientAddress: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}

export interface ResolvedInterAgentMessageDeliveryRequest extends InterAgentMessageDeliveryIntent {
  recipient: InterAgentMessageDeliveryEndpoint;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  resolvedTargetKind: "logical_member" | "agent_run" | "task_agent_run";
  targetAgentRunId: string;
  taskId?: string | null;
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
