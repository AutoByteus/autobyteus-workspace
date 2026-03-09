export class OutboundOutboxService {
    store;
    constructor(store) {
        this.store = store;
    }
    async enqueueOrGet(dispatchKey, payload) {
        return this.store.upsertByDispatchKey({
            dispatchKey,
            payload,
        });
    }
    async leasePending(limit, nowIso) {
        return this.store.leasePending(limit, nowIso);
    }
    async markSending(recordId) {
        return this.store.updateStatus(recordId, {
            status: "SENDING",
            nextAttemptAt: null,
            lastError: null,
        });
    }
    async markSent(recordId) {
        return this.store.updateStatus(recordId, {
            status: "SENT",
            nextAttemptAt: null,
            lastError: null,
        });
    }
    async markRetry(recordId, errorMessage, nextAttemptAtIso) {
        const current = await this.requireRecord(recordId);
        return this.store.updateStatus(recordId, {
            status: "FAILED_RETRY",
            attemptCount: current.attemptCount + 1,
            nextAttemptAt: nextAttemptAtIso,
            lastError: errorMessage,
        });
    }
    async markDeadLetter(recordId, errorMessage) {
        const current = await this.requireRecord(recordId);
        return this.store.updateStatus(recordId, {
            status: "DEAD_LETTER",
            attemptCount: current.attemptCount + 1,
            nextAttemptAt: null,
            lastError: errorMessage,
        });
    }
    async getById(recordId) {
        return this.store.getById(recordId);
    }
    async listByStatus(statuses) {
        return this.store.listByStatus(statuses);
    }
    async replayFromStatus(recordId, expectedStatus) {
        const current = await this.requireRecord(recordId);
        if (current.status !== expectedStatus) {
            throw new Error(`Outbound record ${recordId} status mismatch: expected ${expectedStatus}, got ${current.status}.`);
        }
        return this.store.updateStatus(recordId, {
            status: "PENDING",
            nextAttemptAt: null,
            lastError: null,
        });
    }
    async requireRecord(recordId) {
        const record = await this.store.getById(recordId);
        if (!record) {
            throw new Error(`Outbound outbox record not found: ${recordId}`);
        }
        return record;
    }
}
//# sourceMappingURL=outbound-outbox-service.js.map