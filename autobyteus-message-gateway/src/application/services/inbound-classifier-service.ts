import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelMentionPolicyService } from "./channel-mention-policy-service.js";

export type InboundClassification =
  | { decision: "FORWARDABLE" }
  | { decision: "BLOCKED"; reason: string };

export class InboundClassifierService {
  constructor(private readonly mentionPolicyService: ChannelMentionPolicyService) {}

  classify(envelope: ExternalMessageEnvelope): InboundClassification {
    const decision = this.mentionPolicyService.evaluateIfGroup(envelope);
    if (decision.allowed) {
      return {
        decision: "FORWARDABLE",
      };
    }
    return {
      decision: "BLOCKED",
      reason: decision.reason,
    };
  }
}
