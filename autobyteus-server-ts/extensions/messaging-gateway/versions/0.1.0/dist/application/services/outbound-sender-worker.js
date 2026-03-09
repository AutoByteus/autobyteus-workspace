export class OutboundSenderWorker {
    deps;
    sleep;
    nowIso;
    running = false;
    loopPromise = null;
    constructor(deps) {
        this.deps = deps;
        this.sleep = deps.sleep ?? defaultSleep;
        this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
    }
    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.loopPromise = this.runLoop();
    }
    async stop() {
        this.running = false;
        await this.loopPromise;
        this.loopPromise = null;
    }
    isRunning() {
        return this.running;
    }
    async runOnce() {
        const pending = await this.deps.outboxService.leasePending(this.deps.config.batchSize, this.nowIso());
        for (const record of pending) {
            await this.handleRecord(record);
        }
    }
    async runLoop() {
        while (this.running) {
            try {
                await this.runOnce();
            }
            catch (error) {
                this.deps.onLoopError?.(error);
            }
            if (!this.running) {
                break;
            }
            await this.sleep(this.deps.config.loopIntervalMs);
        }
    }
    async handleRecord(record) {
        const routingKey = `${record.provider}:${record.transport}`;
        const adapter = this.deps.outboundAdaptersByRoutingKey.get(routingKey);
        if (!adapter) {
            await this.deps.outboxService.markDeadLetter(record.id, `Adapter is not configured for routing key ${routingKey}.`);
            return;
        }
        await this.deps.outboxService.markSending(record.id);
        try {
            await adapter.sendOutbound(record.payload);
            await this.deps.outboxService.markSent(record.id);
        }
        catch (error) {
            await this.handleFailure(record, error);
        }
    }
    async handleFailure(record, error) {
        const nextAttempt = record.attemptCount + 1;
        const message = toErrorMessage(error);
        if (isTerminalFailure(error) || nextAttempt >= this.deps.config.maxAttempts) {
            await this.deps.outboxService.markDeadLetter(record.id, message);
            return;
        }
        const delayMs = nextDelayMs(nextAttempt, {
            baseDelayMs: this.deps.config.baseDelayMs,
            maxDelayMs: this.deps.config.maxDelayMs,
            factor: this.deps.config.backoffFactor,
        });
        const nextAttemptAt = new Date(Date.parse(this.nowIso()) + delayMs).toISOString();
        await this.deps.outboxService.markRetry(record.id, message, nextAttemptAt);
    }
}
const defaultSleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const toErrorMessage = (error) => {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return "Unexpected outbound sending error.";
};
const isTerminalFailure = (error) => {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    if (error.retryable === true) {
        return false;
    }
    if (error.retryable === false) {
        return true;
    }
    if ("status" in error && typeof error.status === "number") {
        const status = error.status;
        return status >= 400 && status < 500;
    }
    return false;
};
const nextDelayMs = (attempt, config) => {
    const value = config.baseDelayMs * config.factor ** Math.max(0, attempt - 1);
    return Math.max(0, Math.min(config.maxDelayMs, Math.round(value)));
};
//# sourceMappingURL=outbound-sender-worker.js.map