export class ReliabilityStatusService {
    snapshot;
    constructor(nowIso = () => new Date().toISOString()) {
        const now = nowIso();
        this.snapshot = {
            state: "HEALTHY",
            criticalCode: null,
            updatedAt: now,
            workers: {
                inboundForwarder: {
                    running: false,
                    lastError: null,
                    lastErrorAt: null,
                },
                outboundSender: {
                    running: false,
                    lastError: null,
                    lastErrorAt: null,
                },
            },
            locks: {
                inbox: {
                    ownerId: null,
                    held: false,
                    lost: false,
                    lastHeartbeatAt: null,
                    lastError: null,
                },
                outbox: {
                    ownerId: null,
                    held: false,
                    lost: false,
                    lastHeartbeatAt: null,
                    lastError: null,
                },
            },
        };
        this.nowIso = nowIso;
    }
    nowIso;
    setWorkerRunning(worker, running) {
        this.snapshot.workers[worker].running = running;
        this.touch();
    }
    setWorkerError(worker, message) {
        this.snapshot.workers[worker].lastError = message;
        this.snapshot.workers[worker].lastErrorAt = this.nowIso();
        this.touch();
    }
    setLockHeld(lock, ownerId) {
        this.snapshot.locks[lock].ownerId = ownerId;
        this.snapshot.locks[lock].held = true;
        this.snapshot.locks[lock].lost = false;
        this.snapshot.locks[lock].lastHeartbeatAt = this.nowIso();
        this.snapshot.locks[lock].lastError = null;
        this.touch();
    }
    setLockHeartbeat(lock) {
        this.snapshot.locks[lock].lastHeartbeatAt = this.nowIso();
        this.touch();
    }
    setLockReleased(lock) {
        this.snapshot.locks[lock].held = false;
        this.touch();
    }
    markLockLost(lock, message) {
        this.snapshot.locks[lock].held = false;
        this.snapshot.locks[lock].lost = true;
        this.snapshot.locks[lock].lastError = message;
        this.snapshot.state = "CRITICAL_LOCK_LOST";
        this.snapshot.criticalCode = "CRITICAL_LOCK_LOST";
        this.touch();
    }
    getSnapshot() {
        return structuredClone(this.snapshot);
    }
    touch() {
        this.snapshot.updatedAt = this.nowIso();
    }
}
//# sourceMappingURL=reliability-status-service.js.map