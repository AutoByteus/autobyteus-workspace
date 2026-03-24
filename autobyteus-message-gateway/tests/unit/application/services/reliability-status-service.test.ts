import { describe, expect, it } from "vitest";
import { ReliabilityStatusService } from "../../../../src/application/services/reliability-status-service.js";

describe("ReliabilityStatusService", () => {
  it("tracks worker and lock lifecycle", () => {
    const service = new ReliabilityStatusService(() => "2026-02-12T00:00:00.000Z");

    service.setWorkerRunning("inboundForwarder", true);
    service.setLockHeld("inbox", "owner-1");
    service.setLockHeartbeat("inbox");

    const snapshot = service.getSnapshot();
    expect(snapshot.state).toBe("HEALTHY");
    expect(snapshot.workers.inboundForwarder.running).toBe(true);
    expect(snapshot.locks.inbox.held).toBe(true);
    expect(snapshot.locks.inbox.ownerId).toBe("owner-1");
  });

  it("clears stale ownership when a lock is released", () => {
    const service = new ReliabilityStatusService(() => "2026-02-12T00:00:00.000Z");

    service.setLockHeld("inbox", "owner-1");
    service.setLockReleased("inbox");

    const snapshot = service.getSnapshot();
    expect(snapshot.locks.inbox).toMatchObject({
      ownerId: null,
      held: false,
      lost: false,
      lastHeartbeatAt: null,
      lastError: null,
    });
  });

  it("enters critical state when lock is lost", () => {
    const service = new ReliabilityStatusService(() => "2026-02-12T00:00:00.000Z");
    service.markLockLost("outbox", "ownership lost");

    const snapshot = service.getSnapshot();
    expect(snapshot.state).toBe("CRITICAL_LOCK_LOST");
    expect(snapshot.criticalCode).toBe("CRITICAL_LOCK_LOST");
    expect(snapshot.locks.outbox.lost).toBe(true);
    expect(snapshot.locks.outbox.lastError).toBe("ownership lost");
  });
});
