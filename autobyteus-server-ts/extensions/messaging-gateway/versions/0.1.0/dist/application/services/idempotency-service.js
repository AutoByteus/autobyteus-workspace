export class IdempotencyService {
    store;
    config;
    constructor(store, config) {
        this.store = store;
        this.config = config;
    }
    async checkAndMark(key) {
        return this.store.checkAndSet(key, this.config.ttlSeconds);
    }
    async checkAndMarkEnvelope(envelope) {
        const key = buildInboundIdempotencyKey(envelope);
        return this.checkAndMark(key);
    }
}
export function buildInboundIdempotencyKey(envelope) {
    const threadPart = typeof envelope.threadId === "string" && envelope.threadId.trim().length > 0
        ? envelope.threadId.trim()
        : "_";
    return [
        envelope.provider,
        envelope.transport,
        envelope.accountId,
        envelope.peerId,
        threadPart,
        envelope.externalMessageId,
    ].join(":");
}
//# sourceMappingURL=idempotency-service.js.map