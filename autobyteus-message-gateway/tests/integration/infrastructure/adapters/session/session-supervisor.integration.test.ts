import { describe, expect, it, vi } from "vitest";
import { SessionSupervisor } from "../../../../../src/infrastructure/adapters/session/session-supervisor.js";

describe("SessionSupervisor integration", () => {
  it("reconnects after disconnect signal using backoff scheduling", async () => {
    vi.useFakeTimers();
    const connect = vi.fn(async () => undefined);
    const disconnect = vi.fn(async () => undefined);
    const supervisor = new SessionSupervisor({
      connect,
      disconnect,
      baseDelayMs: 10,
      maxDelayMs: 10,
    });

    try {
      await supervisor.start();
      supervisor.markDisconnected("socket closed");
      await vi.advanceTimersByTimeAsync(20);

      expect(connect).toHaveBeenCalledTimes(2);
      expect(supervisor.getStatus().state).toBe("READY");
    } finally {
      await supervisor.stop();
      vi.useRealTimers();
    }
  });
});
