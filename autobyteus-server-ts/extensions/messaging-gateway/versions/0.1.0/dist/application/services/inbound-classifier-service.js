export class InboundClassifierService {
    mentionPolicyService;
    constructor(mentionPolicyService) {
        this.mentionPolicyService = mentionPolicyService;
    }
    classify(envelope) {
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
//# sourceMappingURL=inbound-classifier-service.js.map