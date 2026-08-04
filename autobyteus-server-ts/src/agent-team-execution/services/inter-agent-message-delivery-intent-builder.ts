import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type { MemberTeamContext } from "../domain/member-team-context.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../domain/inter-agent-message-delivery.js";

export type InterAgentMessageDeliveryIntentBuildResult =
  | { ok: true; intent: InterAgentMessageDeliveryIntent }
  | { ok: false; code: "INVALID_DELIVERY_INTENT"; message: string };

const buildSenderParticipant = (
  context: MemberTeamContext,
): InterAgentMessageParticipant => Object.freeze({
  kind: "agent",
  executionAddress: context.executionAddress,
  agentRunId: context.agentRunId,
  displayName: getAgentTeamAddressBasename(context.memberAddress) ?? context.agentRunId,
  runtimeKind: context.runtimeKind,
  platformAgentRunId: null,
  taskId: context.taskAgentInstance?.taskId ?? context.taskTeamInstance?.taskId ?? null,
});

export const buildInterAgentMessageDeliveryIntent = (input: {
  memberTeamContext: MemberTeamContext;
  recipientAddress: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}): InterAgentMessageDeliveryIntentBuildResult => ({
  ok: true,
  intent: {
    rootTeamRunId: input.memberTeamContext.executionAddress.rootTeamRunId,
    callerAddressing: input.memberTeamContext.collaboration.addressing,
    recipientAddress: input.recipientAddress,
    sender: buildDeliveryEndpointForParticipant(buildSenderParticipant(input.memberTeamContext)),
    content: input.content,
    messageType: input.messageType,
    referenceFiles: input.referenceFiles,
  },
});

export const buildInterAgentMessageDeliveryIntentFromRecipientAddress =
  buildInterAgentMessageDeliveryIntent;
