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

export class ReliabilityStatusService {
  private snapshot: ReliabilityStatusSnapshot;

  constructor(nowIso: () => string = () => new Date().toISOString()) {
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

  private readonly nowIso: () => string;

  setWorkerRunning(worker: "inboundForwarder" | "outboundSender", running: boolean): void {
    this.snapshot.workers[worker].running = running;
    this.touch();
  }

  setWorkerError(worker: "inboundForwarder" | "outboundSender", message: string): void {
    this.snapshot.workers[worker].lastError = message;
    this.snapshot.workers[worker].lastErrorAt = this.nowIso();
    this.touch();
  }

  setLockHeld(lock: "inbox" | "outbox", ownerId: string): void {
    this.snapshot.locks[lock].ownerId = ownerId;
    this.snapshot.locks[lock].held = true;
    this.snapshot.locks[lock].lost = false;
    this.snapshot.locks[lock].lastHeartbeatAt = this.nowIso();
    this.snapshot.locks[lock].lastError = null;
    this.touch();
  }

  setLockHeartbeat(lock: "inbox" | "outbox"): void {
    this.snapshot.locks[lock].lastHeartbeatAt = this.nowIso();
    this.touch();
  }

  setLockReleased(lock: "inbox" | "outbox"): void {
    this.snapshot.locks[lock].held = false;
    this.touch();
  }

  markLockLost(lock: "inbox" | "outbox", message: string): void {
    this.snapshot.locks[lock].held = false;
    this.snapshot.locks[lock].lost = true;
    this.snapshot.locks[lock].lastError = message;
    this.snapshot.state = "CRITICAL_LOCK_LOST";
    this.snapshot.criticalCode = "CRITICAL_LOCK_LOST";
    this.touch();
  }

  getSnapshot(): ReliabilityStatusSnapshot {
    return structuredClone(this.snapshot);
  }

  private touch(): void {
    this.snapshot.updatedAt = this.nowIso();
  }
}
