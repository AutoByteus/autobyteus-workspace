import { afterEach, describe, expect, it } from "vitest";
import {
  computeManagedGatewayRestartDelayMs,
  isHeartbeatStale,
  readManagedRuntimeReliabilityStatus,
} from "../../../../src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-health.js";

describe("managed-messaging-gateway-runtime-health", () => {
  afterEach(() => {
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_BASE_DELAY_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_DELAY_MS;
  });

  it("parses runtime reliability payloads into the supervision-friendly shape", () => {
    expect(
      readManagedRuntimeReliabilityStatus({
        runtime: {
          state: "HEALTHY",
          updatedAt: "2026-03-10T10:00:00.000Z",
          workers: {
            inboundForwarder: {
              running: true,
            },
            outboundSender: {
              running: false,
            },
          },
          locks: {
            inbox: {
              held: true,
              lost: false,
              lastHeartbeatAt: "2026-03-10T10:00:01.000Z",
            },
            outbox: {
              held: false,
              lost: true,
              lastHeartbeatAt: "2026-03-10T10:00:02.000Z",
            },
          },
        },
      }),
    ).toEqual({
      state: "HEALTHY",
      updatedAt: "2026-03-10T10:00:00.000Z",
      inboundForwarderRunning: true,
      outboundSenderRunning: false,
      inboxLockHeld: true,
      outboxLockHeld: false,
      inboxLockLost: false,
      outboxLockLost: true,
      inboxLastHeartbeatAt: "2026-03-10T10:00:01.000Z",
      outboxLastHeartbeatAt: "2026-03-10T10:00:02.000Z",
    });
  });

  it("returns null when required runtime reliability fields are missing", () => {
    expect(readManagedRuntimeReliabilityStatus({ runtime: { state: "HEALTHY" } })).toBeNull();
  });

  it("computes bounded restart delays and treats missing or invalid heartbeats as stale", () => {
    process.env.MANAGED_MESSAGING_GATEWAY_RESTART_BASE_DELAY_MS = "10";
    process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_DELAY_MS = "25";

    expect(computeManagedGatewayRestartDelayMs(1)).toBe(10);
    expect(computeManagedGatewayRestartDelayMs(2)).toBe(20);
    expect(computeManagedGatewayRestartDelayMs(3)).toBe(25);

    expect(isHeartbeatStale(null, Date.now(), 5_000)).toBe(true);
    expect(isHeartbeatStale("not-a-date", Date.now(), 5_000)).toBe(true);
    expect(isHeartbeatStale("2026-03-10T10:00:00.000Z", Date.parse("2026-03-10T10:00:03.000Z"), 5_000)).toBe(false);
    expect(isHeartbeatStale("2026-03-10T10:00:00.000Z", Date.parse("2026-03-10T10:00:07.000Z"), 5_000)).toBe(true);
  });
});
