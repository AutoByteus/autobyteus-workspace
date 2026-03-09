import { ExternalDeliveryStatus, } from "autobyteus-ts/external-channel/external-delivery-event.js";
import { nextDelayMs } from "../../infrastructure/retry/exponential-backoff.js";
import { OutboundChunkPlanner } from "./outbound-chunk-planner.js";
export class OutboundMessageService {
    deps;
    chunkPlanner;
    constructor(deps) {
        this.deps = deps;
        this.chunkPlanner = deps.chunkPlanner ?? new OutboundChunkPlanner();
    }
    async handleOutbound(payload) {
        const chunks = this.chunkPlanner.planChunks(payload);
        const plannedPayload = {
            ...payload,
            chunks,
        };
        const routingKey = `${payload.provider}:${payload.transport}`;
        const adapter = this.deps.outboundAdaptersByRoutingKey.get(routingKey);
        if (!adapter) {
            throw new Error(`Adapter is not configured for routing key ${routingKey}.`);
        }
        const maxAttempts = Math.max(1, this.deps.config.maxAttempts);
        let attempt = 0;
        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                await adapter.sendOutbound(plannedPayload);
                const deliveredEvent = this.buildEvent(plannedPayload, ExternalDeliveryStatus.DELIVERED, null);
                await this.deps.deliveryStatusService.record(deliveredEvent);
                await this.deps.deliveryStatusService.publishToServer(deliveredEvent);
                return {
                    delivered: true,
                    attempts: attempt,
                    deadLettered: false,
                };
            }
            catch (error) {
                const retryable = isRetryable(error);
                if (!retryable || attempt >= maxAttempts) {
                    const failureError = error instanceof Error ? error : new Error("Unknown outbound error.");
                    await this.deps.deadLetterService.recordFailedOutbound(plannedPayload, failureError);
                    const failedEvent = this.buildEvent(plannedPayload, ExternalDeliveryStatus.FAILED, failureError.message);
                    await this.deps.deliveryStatusService.record(failedEvent);
                    await this.deps.deliveryStatusService.publishToServer(failedEvent);
                    return {
                        delivered: false,
                        attempts: attempt,
                        deadLettered: true,
                    };
                }
                const delayMs = this.nextDelayMs(attempt);
                const sleep = this.deps.sleep ?? defaultSleep;
                await sleep(delayMs);
            }
        }
        return {
            delivered: false,
            attempts: maxAttempts,
            deadLettered: true,
        };
    }
    nextDelayMs(attempt) {
        return nextDelayMs(attempt, {
            baseDelayMs: this.deps.config.baseDelayMs,
            maxDelayMs: this.deps.config.maxDelayMs ?? this.deps.config.baseDelayMs * 16,
            factor: this.deps.config.backoffFactor ?? 2,
        });
    }
    buildEvent(payload, status, errorMessage) {
        const metadata = {
            callbackIdempotencyKey: payload.callbackIdempotencyKey,
            chunkCount: payload.chunks.length,
            ...(errorMessage ? { errorMessage } : {}),
        };
        return {
            provider: payload.provider,
            transport: payload.transport,
            accountId: payload.accountId,
            peerId: payload.peerId,
            threadId: payload.threadId,
            correlationMessageId: payload.correlationMessageId,
            status,
            occurredAt: new Date().toISOString(),
            metadata,
        };
    }
}
const isRetryable = (error) => {
    if (!error || typeof error !== "object") {
        return false;
    }
    if (error.retryable === true) {
        return true;
    }
    return false;
};
const defaultSleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
//# sourceMappingURL=outbound-message-service.js.map