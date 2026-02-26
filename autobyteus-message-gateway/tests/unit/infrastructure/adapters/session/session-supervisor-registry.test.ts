import { describe, expect, it, vi } from "vitest";
import { SessionSupervisorRegistry } from "../../../../../src/infrastructure/adapters/session/session-supervisor-registry.js";

describe("SessionSupervisorRegistry", () => {
  it("starts/stops all supervisors and routes disconnect by provider", async () => {
    const registry = new SessionSupervisorRegistry();
    const discord = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      markDisconnected: vi.fn(),
      getStatus: vi.fn(() => ({
        state: "READY" as const,
        reconnectAttempt: 0,
        lastConnectedAt: "2026-02-12T00:00:00.000Z",
        lastDisconnectedAt: null,
        lastError: null,
      })),
    };
    const wechat = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      markDisconnected: vi.fn(),
      getStatus: vi.fn(() => ({
        state: "DEGRADED" as const,
        reconnectAttempt: 2,
        lastConnectedAt: "2026-02-12T00:00:00.000Z",
        lastDisconnectedAt: "2026-02-12T00:01:00.000Z",
        lastError: "socket closed",
      })),
    };

    registry.register("discord", discord);
    registry.register("wechat_personal", wechat);
    await registry.startAll();
    registry.markDisconnected("discord", "CLOSE_1006");
    await registry.stopAll();

    expect(discord.start).toHaveBeenCalledOnce();
    expect(wechat.start).toHaveBeenCalledOnce();
    expect(discord.markDisconnected).toHaveBeenCalledWith("CLOSE_1006");
    expect(discord.stop).toHaveBeenCalledOnce();
    expect(wechat.stop).toHaveBeenCalledOnce();
    expect(registry.getStatusByProvider()).toMatchObject({
      DISCORD: { state: "READY" },
      WECHAT_PERSONAL: { state: "DEGRADED" },
    });
  });

  it("prevents duplicate provider registration", () => {
    const registry = new SessionSupervisorRegistry();
    const supervisor = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      markDisconnected: vi.fn(),
      getStatus: vi.fn(() => ({
        state: "STOPPED" as const,
        reconnectAttempt: 0,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        lastError: null,
      })),
    };

    registry.register("discord", supervisor);
    expect(() => registry.register("DISCORD", supervisor)).toThrow("already registered");
  });
});
