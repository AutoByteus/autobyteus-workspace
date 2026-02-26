import { describe, expect, it, vi } from "vitest";
import { SessionSupervisor } from "../../../../../src/infrastructure/adapters/session/session-supervisor.js";

describe("SessionSupervisor", () => {
  it("connects on start and transitions to READY", async () => {
    const connect = vi.fn(async () => undefined);
    const disconnect = vi.fn(async () => undefined);

    const supervisor = new SessionSupervisor({
      connect,
      disconnect,
    });

    await supervisor.start();
    const status = supervisor.getStatus();
    expect(connect).toHaveBeenCalledOnce();
    expect(status.state).toBe("READY");
  });

  it("reconnects after disconnected signal", async () => {
    const connect = vi.fn(async () => undefined);
    const disconnect = vi.fn(async () => undefined);
    vi.useFakeTimers();

    try {
      const supervisor = new SessionSupervisor({
        connect,
        disconnect,
        baseDelayMs: 10,
        maxDelayMs: 10,
      });

      await supervisor.start();
      supervisor.markDisconnected("socket closed");
      await vi.advanceTimersByTimeAsync(20);

      expect(connect).toHaveBeenCalledTimes(2);
      expect(supervisor.getStatus().state).toBe("READY");
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops retrying after max attempts", async () => {
    const connect = vi.fn(async () => {
      throw new Error("connect failed");
    });
    const disconnect = vi.fn(async () => undefined);
    vi.useFakeTimers();

    try {
      const supervisor = new SessionSupervisor({
        connect,
        disconnect,
        baseDelayMs: 10,
        maxDelayMs: 10,
        maxAttempts: 2,
      });

      await supervisor.start();
      await vi.advanceTimersByTimeAsync(50);

      expect(connect).toHaveBeenCalledTimes(3);
      expect(supervisor.getStatus().state).toBe("DEGRADED");
      expect(supervisor.getStatus().reconnectAttempt).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
