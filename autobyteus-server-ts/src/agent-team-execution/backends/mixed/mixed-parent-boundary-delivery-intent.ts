import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../../domain/inter-agent-message-delivery.js";
import {
  buildMemberRouteKeyFromPath,
  selectorFromMemberPath,
} from "../../domain/team-run-member-identity.js";
import type { MixedParentBoundaryContext } from "./mixed-team-run-context.js";

const pathStartsWith = (
  path: readonly string[],
  prefix: readonly string[],
): boolean =>
  path.length >= prefix.length &&
  prefix.every((segment, index) => path[index] === segment);

export const normalizeMixedParentBoundaryDeliveryIntent = (input: {
  intent: InterAgentMessageDeliveryIntent;
  parentBoundary: MixedParentBoundaryContext | null;
}): InterAgentMessageDeliveryIntent => {
  const { intent, parentBoundary } = input;
  if (!parentBoundary) {
    return intent;
  }
  const sender = intent.sender.participant;
  const representedSubTeamPath = parentBoundary.representedSubTeam.memberPath;
  const senderIsAlreadyParentRooted =
    sender.address.teamRunId === parentBoundary.parentTeamRunId &&
    pathStartsWith(sender.memberPath, representedSubTeamPath);
  const nestedSenderPath = senderIsAlreadyParentRooted
    ? [...sender.memberPath]
    : [...representedSubTeamPath, ...sender.memberPath];
  const nestedSenderRouteKey = buildMemberRouteKeyFromPath(nestedSenderPath);
  const nestedSender: InterAgentMessageParticipant = {
    ...sender,
    memberPath: nestedSenderPath,
    memberRouteKey: nestedSenderRouteKey,
    address: buildTeamMemberAddress({
      teamRunId: parentBoundary.parentTeamRunId,
      memberPath: nestedSenderPath,
      memberRouteKey: nestedSenderRouteKey,
    }),
    representedSubTeam: parentBoundary.representedSubTeam,
  };
  return {
    ...intent,
    teamRunId: parentBoundary.parentTeamRunId,
    sender: buildDeliveryEndpointForParticipant(
      nestedSender,
      selectorFromMemberPath(nestedSenderPath),
    ),
  };
};
