export class InboundEnvelopeBridgeService {
    inboundMessageService;
    errorReporter;
    infoReporter;
    constructor(inboundMessageService, errorReporter = defaultInboundEnvelopeErrorReporter, infoReporter = defaultInboundEnvelopeInfoReporter) {
        this.inboundMessageService = inboundMessageService;
        this.errorReporter = errorReporter;
        this.infoReporter = infoReporter;
    }
    async handleEnvelope(envelope) {
        try {
            const result = await this.inboundMessageService.handleNormalizedEnvelope(envelope);
            if (result.duplicate) {
                this.infoReporter({
                    envelope,
                    result,
                    reason: "DUPLICATE",
                });
            }
        }
        catch (error) {
            this.errorReporter({
                envelope,
                error,
            });
        }
    }
}
const defaultInboundEnvelopeErrorReporter = ({ envelope, error, }) => {
    const accountId = envelope.accountId ?? "unknown";
    const externalMessageId = envelope.externalMessageId ?? "unknown";
    console.error("[gateway] failed to forward inbound envelope", {
        provider: envelope.provider,
        transport: envelope.transport,
        accountId,
        externalMessageId,
        error,
    });
};
const defaultInboundEnvelopeInfoReporter = ({ envelope, result, reason, }) => {
    const accountId = envelope.accountId ?? "unknown";
    const externalMessageId = envelope.externalMessageId ?? "unknown";
    console.info("[gateway] inbound envelope deduplicated and skipped enqueue", {
        provider: envelope.provider,
        transport: envelope.transport,
        accountId,
        externalMessageId,
        reason,
        disposition: result.disposition,
    });
};
//# sourceMappingURL=inbound-envelope-bridge-service.js.map