import { describe, expect, it, vi } from "vitest";
import { createGatewayRuntimeLifecycle } from "../../../src/bootstrap/gateway-runtime-lifecycle.js";

describe("gateway-runtime-lifecycle", () => {
  it("rolls back workers and queue locks when startup fails after partial success", async () => {
    const inboxOwnerLock = {
      acquire: vi.fn(async () => undefined),
      release: vi.fn(async () => undefined),
      heartbeat: vi.fn(async () => undefined),
      getOwnerId: vi.fn(() => "inbox-owner"),
    };
    const outboxOwnerLock = {
      acquire: vi.fn(async () => undefined),
      release: vi.fn(async () => undefined),
      heartbeat: vi.fn(async () => undefined),
      getOwnerId: vi.fn(() => "outbox-owner"),
    };
    const inboundForwarderWorker = {
      start: vi.fn(),
      stop: vi.fn(async () => undefined),
    };
    const outboundSenderWorker = {
      start: vi.fn(),
      stop: vi.fn(async () => undefined),
    };
    const reliabilityStatusService = {
      setWorkerRunning: vi.fn(),
      setWorkerError: vi.fn(),
      setLockHeld: vi.fn(),
      setLockHeartbeat: vi.fn(),
      setLockReleased: vi.fn(),
      markLockLost: vi.fn(),
    };
    const sessionSupervisorRegistry = {
      startAll: vi.fn(async () => {
        throw new Error("startup failed");
      }),
      stopAll: vi.fn(async () => undefined),
    };

    const lifecycle = createGatewayRuntimeLifecycle({
      inboxOwnerLock,
      outboxOwnerLock,
      inboundForwarderWorker,
      outboundSenderWorker,
      reliabilityStatusService,
      sessionSupervisorRegistry,
    });

    await expect(lifecycle.start()).rejects.toThrow("startup failed");

    expect(inboxOwnerLock.acquire).toHaveBeenCalledOnce();
    expect(outboxOwnerLock.acquire).toHaveBeenCalledOnce();
    expect(inboundForwarderWorker.start).toHaveBeenCalledOnce();
    expect(outboundSenderWorker.start).toHaveBeenCalledOnce();
    expect(sessionSupervisorRegistry.stopAll).toHaveBeenCalledOnce();
    expect(inboundForwarderWorker.stop).toHaveBeenCalledOnce();
    expect(outboundSenderWorker.stop).toHaveBeenCalledOnce();
    expect(inboxOwnerLock.release).toHaveBeenCalledOnce();
    expect(outboxOwnerLock.release).toHaveBeenCalledOnce();
    expect(reliabilityStatusService.setWorkerRunning).toHaveBeenCalledWith(
      "inboundForwarder",
      true,
    );
    expect(reliabilityStatusService.setWorkerRunning).toHaveBeenCalledWith(
      "outboundSender",
      true,
    );
    expect(reliabilityStatusService.setWorkerRunning).toHaveBeenCalledWith(
      "inboundForwarder",
      false,
    );
    expect(reliabilityStatusService.setWorkerRunning).toHaveBeenCalledWith(
      "outboundSender",
      false,
    );
    expect(reliabilityStatusService.setLockReleased).toHaveBeenCalledWith("inbox");
    expect(reliabilityStatusService.setLockReleased).toHaveBeenCalledWith("outbox");
  });
});
