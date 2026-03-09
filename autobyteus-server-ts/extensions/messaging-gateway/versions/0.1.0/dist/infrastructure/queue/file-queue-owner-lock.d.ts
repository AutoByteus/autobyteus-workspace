export type FileQueueOwnerLockConfig = {
    rootDir: string;
    namespace: string;
    ownerId?: string;
    leaseMs?: number;
    nowEpochMs?: () => number;
};
export declare class QueueOwnerLockLostError extends Error {
    constructor(message: string);
}
export declare class FileQueueOwnerLock {
    private readonly lockPath;
    private readonly claimPath;
    private readonly ownerId;
    private readonly leaseMs;
    private readonly nowEpochMs;
    private acquired;
    constructor(config: FileQueueOwnerLockConfig);
    acquire(): Promise<void>;
    heartbeat(): Promise<void>;
    release(): Promise<void>;
    getOwnerId(): string;
    private buildState;
    private readLock;
    private writeLock;
    private acquireClaim;
    private releaseClaim;
    private readClaim;
}
//# sourceMappingURL=file-queue-owner-lock.d.ts.map