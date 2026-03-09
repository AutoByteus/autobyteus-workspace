export type ReliabilityHealthState = "HEALTHY" | "CRITICAL_LOCK_LOST";
export type ReliabilityWorkerStatus = {
    running: boolean;
    lastError: string | null;
    lastErrorAt: string | null;
};
export type ReliabilityLockStatus = {
    ownerId: string | null;
    held: boolean;
    lost: boolean;
    lastHeartbeatAt: string | null;
    lastError: string | null;
};
export type ReliabilityStatusSnapshot = {
    state: ReliabilityHealthState;
    criticalCode: string | null;
    updatedAt: string;
    workers: {
        inboundForwarder: ReliabilityWorkerStatus;
        outboundSender: ReliabilityWorkerStatus;
    };
    locks: {
        inbox: ReliabilityLockStatus;
        outbox: ReliabilityLockStatus;
    };
};
export declare class ReliabilityStatusService {
    private snapshot;
    constructor(nowIso?: () => string);
    private readonly nowIso;
    setWorkerRunning(worker: "inboundForwarder" | "outboundSender", running: boolean): void;
    setWorkerError(worker: "inboundForwarder" | "outboundSender", message: string): void;
    setLockHeld(lock: "inbox" | "outbox", ownerId: string): void;
    setLockHeartbeat(lock: "inbox" | "outbox"): void;
    setLockReleased(lock: "inbox" | "outbox"): void;
    markLockLost(lock: "inbox" | "outbox", message: string): void;
    getSnapshot(): ReliabilityStatusSnapshot;
    private touch;
}
//# sourceMappingURL=reliability-status-service.d.ts.map