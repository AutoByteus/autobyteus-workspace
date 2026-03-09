import { buildInboundIdempotencyKey } from "./idempotency-service.js";
export class InboundInboxService {
    store;
    constructor(store) {
        this.store = store;
    }
    async enqueue(envelope) {
        return this.store.upsertByIngressKey({
            ingressKey: buildInboundIdempotencyKey(envelope),
            payload: envelope,
        });
    }
    async leasePending(limit, nowIso) {
        return this.store.leasePending(limit, nowIso);
    }
    async markForwarding(recordId) {
        return this.store.updateStatus(recordId, {
            status: "FORWARDING",
            nextAttemptAt: null,
            lastError: null,
        });
    }
    async markCompleted(recordId, disposition) {
        return this.store.updateStatus(recordId, {
            status: dispositionToStatus(disposition),
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
    async markBlocked(recordId, reason) {
        return this.store.updateStatus(recordId, {
            status: "BLOCKED",
            nextAttemptAt: null,
            lastError: reason,
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
            throw new Error(`Inbound record ${recordId} status mismatch: expected ${expectedStatus}, got ${current.status}.`);
        }
        return this.store.updateStatus(recordId, {
            status: "RECEIVED",
            nextAttemptAt: null,
            lastError: null,
        });
    }
    async requireRecord(recordId) {
        const record = await this.store.getById(recordId);
        if (!record) {
            throw new Error(`Inbound inbox record not found: ${recordId}`);
        }
        return record;
    }
}
const dispositionToStatus = (disposition) => {
    if (disposition === "ROUTED") {
        return "COMPLETED_ROUTED";
    }
    if (disposition === "UNBOUND") {
        return "COMPLETED_UNBOUND";
    }
    return "COMPLETED_DUPLICATE";
};
//# sourceMappingURL=inbound-inbox-service.js.map