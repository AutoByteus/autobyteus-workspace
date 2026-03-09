export class InboundMessageService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async handleInbound(provider, request) {
        const adapter = this.deps.adaptersByProvider.get(provider);
        if (!adapter) {
            throw new Error(`Adapter is not configured for provider ${provider}.`);
        }
        const envelopes = adapter.parseInbound(request);
        let duplicate = true;
        let blocked = false;
        let forwarded = false;
        for (const envelope of envelopes) {
            const result = await this.handleNormalizedEnvelope(envelope);
            duplicate = duplicate && result.duplicate;
            blocked = blocked || result.blocked;
            forwarded = forwarded || result.forwarded;
        }
        return {
            accepted: true,
            duplicate,
            blocked,
            forwarded,
            envelopeCount: envelopes.length,
        };
    }
    async handleNormalizedEnvelope(envelope) {
        const enqueueResult = await this.deps.inboundInboxService.enqueue(envelope);
        if (enqueueResult.duplicate) {
            return {
                duplicate: true,
                blocked: false,
                forwarded: false,
                disposition: "DUPLICATE",
                bindingResolved: false,
            };
        }
        return {
            duplicate: false,
            blocked: false,
            forwarded: false,
            disposition: "QUEUED",
            bindingResolved: false,
        };
    }
}
//# sourceMappingURL=inbound-message-service.js.map