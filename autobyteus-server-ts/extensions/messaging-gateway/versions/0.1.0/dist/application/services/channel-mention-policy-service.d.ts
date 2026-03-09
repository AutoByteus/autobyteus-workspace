import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
export type MentionPolicyDecision = {
    allowed: boolean;
    reason: "ALLOWED" | "GROUP_MENTION_REQUIRED";
};
export declare class ChannelMentionPolicyService {
    evaluateIfGroup(envelope: ExternalMessageEnvelope): MentionPolicyDecision;
}
//# sourceMappingURL=channel-mention-policy-service.d.ts.map