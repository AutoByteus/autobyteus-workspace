import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../domain/inter-agent-message-delivery.js";

export type InterAgentMessageDeliveryIntentBuildResult =
  | { ok: true; intent: InterAgentMessageDeliveryIntent }
  | { ok: false; code: "INVALID_DELIVERY_INTENT"; message: string };

const buildSenderParticipant = (
  context: MemberExecutionContext,
): InterAgentMessageParticipant => Object.freeze({
  kind: "agent",
  identity: context.identity,
  displayName: getAgentTeamAddressBasename(context.identity.memberAddress) ?? context.identity.agentRunId,
});

export const buildInterAgentMessageDeliveryIntent = (input: {
  memberExecutionContext: MemberExecutionContext;
  recipientAddress: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}): InterAgentMessageDeliveryIntentBuildResult => input.memberExecutionContext.identity.root.rootSubjectKind !== "agent_team"
  ? { ok: false, code: "INVALID_DELIVERY_INTENT", message: "Team delivery requires a Team root identity." }
  : ({
    ok: true,
    intent: {
    rootTeamRunId: input.memberExecutionContext.identity.root.rootRunId,
    recipientAddress: input.recipientAddress,
    sender: buildDeliveryEndpointForParticipant(buildSenderParticipant(input.memberExecutionContext)),
    content: input.content,
    messageType: input.messageType,
    referenceFiles: input.referenceFiles,
    },
  });

export const buildInterAgentMessageDeliveryIntentFromRecipientAddress =
  buildInterAgentMessageDeliveryIntent;
