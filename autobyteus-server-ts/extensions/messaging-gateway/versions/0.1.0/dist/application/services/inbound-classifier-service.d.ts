import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelMentionPolicyService } from "./channel-mention-policy-service.js";
export type InboundClassification = {
    decision: "FORWARDABLE";
} | {
    decision: "BLOCKED";
    reason: string;
};
export declare class InboundClassifierService {
    private readonly mentionPolicyService;
    constructor(mentionPolicyService: ChannelMentionPolicyService);
    classify(envelope: ExternalMessageEnvelope): InboundClassification;
}
//# sourceMappingURL=inbound-classifier-service.d.ts.map