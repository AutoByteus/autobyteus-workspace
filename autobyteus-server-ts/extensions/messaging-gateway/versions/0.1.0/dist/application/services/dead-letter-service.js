export class DeadLetterService {
    records = [];
    async recordFailedOutbound(payload, error) {
        this.records.push({
            callbackIdempotencyKey: payload.callbackIdempotencyKey,
            correlationMessageId: payload.correlationMessageId,
            provider: payload.provider,
            transport: payload.transport,
            errorMessage: error.message,
            recordedAt: new Date().toISOString(),
        });
    }
    listDeadLetters() {
        return [...this.records];
    }
}
//# sourceMappingURL=dead-letter-service.js.map