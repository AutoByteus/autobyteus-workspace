import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
export class ChannelMentionPolicyService {
    evaluateIfGroup(envelope) {
        if (envelope.peerType !== ExternalPeerType.GROUP) {
            return {
                allowed: true,
                reason: "ALLOWED",
            };
        }
        const mentioned = envelope.metadata.mentioned === true ||
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
//# sourceMappingURL=channel-mention-policy-service.js.map