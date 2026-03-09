const DEFAULT_BASE_DELAY_MS = 1_000;
const DEFAULT_MAX_DELAY_MS = 30_000;
export class SessionSupervisor {
    connect;
    disconnect;
    baseDelayMs;
    maxDelayMs;
    maxAttempts;
    nowIso;
    sleep;
    onStatusChange;
    running = false;
    reconnectTimer = null;
    status = {
        state: "STOPPED",
        reconnectAttempt: 0,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        lastError: null,
    };
    constructor(deps) {
        this.connect = deps.connect;
        this.disconnect = deps.disconnect;
        this.baseDelayMs = deps.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
        this.maxDelayMs = deps.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
        this.maxAttempts = deps.maxAttempts ?? null;
        this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
        this.sleep = deps.sleep ?? defaultSleep;
        this.onStatusChange = deps.onStatusChange;
    }
    async start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.updateStatus({
            state: "CONNECTING",
            lastError: null,
            lastDisconnectedAt: null,
        });
        await this.tryConnect();
    }
    async stop() {
        this.running = false;
        this.clearReconnectTimer();
        await this.disconnect();
        this.updateStatus({
            state: "STOPPED",
        });
    }
    markDisconnected(reason) {
        if (!this.running) {
            return;
        }
        this.updateStatus({
            state: "DEGRADED",
            lastDisconnectedAt: this.nowIso(),
            lastError: reason,
        });
        this.scheduleReconnect();
    }
    getStatus() {
        return structuredClone(this.status);
    }
    async tryConnect() {
        if (!this.running) {
            return;
        }
        try {
            await this.connect();
            this.updateStatus({
                state: "READY",
                reconnectAttempt: 0,
                lastConnectedAt: this.nowIso(),
                lastError: null,
            });
        }
        catch (error) {
            this.updateStatus({
                state: "DEGRADED",
                lastError: toErrorMessage(error),
            });
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (!this.running) {
            return;
        }
        if (this.reconnectTimer) {
            return;
        }
        if (this.maxAttempts !== null && this.status.reconnectAttempt >= this.maxAttempts) {
            return;
        }
        const nextAttempt = this.status.reconnectAttempt + 1;
        const delayMs = Math.min(this.maxDelayMs, Math.round(this.baseDelayMs * 2 ** Math.max(0, nextAttempt - 1)));
        this.updateStatus({
            reconnectAttempt: nextAttempt,
        });
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.tryReconnect();
        }, delayMs);
    }
    async tryReconnect() {
        if (!this.running) {
            return;
        }
        this.updateStatus({
            state: "CONNECTING",
        });
        await this.sleep(0);
        await this.tryConnect();
    }
    clearReconnectTimer() {
        if (!this.reconnectTimer) {
            return;
        }
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }
    updateStatus(next) {
        this.status = {
            ...this.status,
            ...next,
        };
        this.onStatusChange?.(this.getStatus());
    }
}
const defaultSleep = (delayMs) => new Promise((resolve) => {
    setTimeout(resolve, delayMs);
});
const toErrorMessage = (error) => error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Session connection failed.";
//# sourceMappingURL=session-supervisor.js.map