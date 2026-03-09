export type SessionSupervisorState = "STOPPED" | "CONNECTING" | "READY" | "DEGRADED";
export type SessionSupervisorStatus = {
    state: SessionSupervisorState;
    reconnectAttempt: number;
    lastConnectedAt: string | null;
    lastDisconnectedAt: string | null;
    lastError: string | null;
};
export type SessionSupervisorDeps = {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    baseDelayMs?: number;
    maxDelayMs?: number;
    maxAttempts?: number | null;
    nowIso?: () => string;
    sleep?: (delayMs: number) => Promise<void>;
    onStatusChange?: (status: SessionSupervisorStatus) => void;
};
export declare class SessionSupervisor {
    private readonly connect;
    private readonly disconnect;
    private readonly baseDelayMs;
    private readonly maxDelayMs;
    private readonly maxAttempts;
    private readonly nowIso;
    private readonly sleep;
    private readonly onStatusChange?;
    private running;
    private reconnectTimer;
    private status;
    constructor(deps: SessionSupervisorDeps);
    start(): Promise<void>;
    stop(): Promise<void>;
    markDisconnected(reason: string): void;
    getStatus(): SessionSupervisorStatus;
    private tryConnect;
    private scheduleReconnect;
    private tryReconnect;
    private clearReconnectTimer;
    private updateStatus;
}
//# sourceMappingURL=session-supervisor.d.ts.map