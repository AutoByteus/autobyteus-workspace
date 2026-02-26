import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";

export type MentionPolicyDecision = {
  allowed: boolean;
  reason: "ALLOWED" | "GROUP_MENTION_REQUIRED";
};

export class ChannelMentionPolicyService {
  evaluateIfGroup(envelope: ExternalMessageEnvelope): MentionPolicyDecision {
    if (envelope.peerType !== ExternalPeerType.GROUP) {
      return {
        allowed: true,
        reason: "ALLOWED",
      };
    }

    const mentioned =
      envelope.metadata.mentioned === true ||
      envelope.metadata.isMentioned === true ||
      envelope.metadata.mentionsAgent === true;

    if (mentioned) {
      return {
        allowed: true,
        reason: "ALLOWED",
      };
    }

    return {
      allowed: false,
      reason: "GROUP_MENTION_REQUIRED",
    };
  }
}
