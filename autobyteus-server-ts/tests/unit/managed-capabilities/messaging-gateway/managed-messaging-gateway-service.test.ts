import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManagedMessagingGatewayService } from "../../../../src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.js";

const tempDirs: string[] = [];

describe("ManagedMessagingGatewayService", () => {
  afterEach(async () => {
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_BASE_DELAY_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_DELAY_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_ATTEMPTS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_HEARTBEAT_STALE_AFTER_MS;
    delete process.env.MANAGED_MESSAGING_GATEWAY_SUPERVISION_INTERVAL_MS;
    await Promise.all(
      tempDirs.splice(0).map((dir) =>
        fs.rm(dir, { recursive: true, force: true }),
      ),
    );
  });

  it("schedules a managed restart after an unexpected gateway exit", async () => {
    const harness = await createHarness({
      runtimeSnapshot: {
        running: false,
        bindHost: "127.0.0.1",
        bindPort: 8010,
        pid: null,
        startedAt: "2026-03-10T10:00:00.000Z",
      },
      runtimeReliabilityStatus: null,
    });
    const restartActiveRuntime = vi.fn().mockResolvedValue(undefined);
    harness.service.restartActiveRuntime = restartActiveRuntime;

    await harness.service.handleProcessExit(1, null, false);
    await sleep(10);

    const state = await harness.storage.readState();
    expect(state.lifecycleState).toBe("DEGRADED");
    expect(state.message).toContain("exited unexpectedly");
    expect(restartActiveRuntime).toHaveBeenCalledWith({
      reason: "Managed messaging gateway exited unexpectedly.",
    });

    harness.service.stopRuntimeSupervision();
  });

  it("schedules a managed restart when runtime heartbeat supervision detects a stale gateway", async () => {
    const harness = await createHarness({
      runtimeSnapshot: {
        running: true,
        bindHost: "127.0.0.1",
        bindPort: 8010,
        pid: 4321,
        startedAt: "2026-03-10T10:00:00.000Z",
      },
      runtimeReliabilityStatus: {
        runtime: {
          state: "HEALTHY",
          updatedAt: "2000-01-01T00:00:00.000Z",
          workers: {
            inboundForwarder: {
              running: true,
            },
            outboundSender: {
              running: true,
            },
          },
          locks: {
            inbox: {
              held: true,
              lost: false,
              lastHeartbeatAt: "2000-01-01T00:00:00.000Z",
            },
            outbox: {
              held: true,
              lost: false,
              lastHeartbeatAt: "2000-01-01T00:00:00.000Z",
            },
          },
        },
        queue: {},
      },
    });
    const restartActiveRuntime = vi.fn().mockResolvedValue(undefined);
    harness.service.restartActiveRuntime = restartActiveRuntime;

    await harness.service.runRuntimeSupervisionCheck();
    await sleep(10);

    const state = await harness.storage.readState();
    expect(state.lifecycleState).toBe("DEGRADED");
    expect(state.message).toContain("heartbeat became stale");
    expect(restartActiveRuntime).toHaveBeenCalledWith({
      reason: "Managed messaging gateway heartbeat became stale.",
    });

    harness.service.stopRuntimeSupervision();
  });

  it("does not schedule a managed restart after the service has begun closing", async () => {
    const harness = await createHarness({
      runtimeSnapshot: {
        running: false,
        bindHost: "127.0.0.1",
        bindPort: 8010,
        pid: null,
        startedAt: "2026-03-10T10:00:00.000Z",
      },
      runtimeReliabilityStatus: null,
    });
    const restartActiveRuntime = vi.fn().mockResolvedValue(undefined);
    harness.service.restartActiveRuntime = restartActiveRuntime;

    await harness.service.close();
    await harness.service.handleProcessExit(1, null, false);
    await sleep(10);

    expect(restartActiveRuntime).not.toHaveBeenCalled();
  });
});

const createHarness = async (input: {
  runtimeSnapshot: {
    running: boolean;
    bindHost: string | null;
    bindPort: number | null;
    pid: number | null;
    startedAt: string | null;
  };
  runtimeReliabilityStatus: Record<string, unknown> | null;
}) => {
  process.env.MANAGED_MESSAGING_GATEWAY_RESTART_BASE_DELAY_MS = "1";
  process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_DELAY_MS = "1";
  process.env.MANAGED_MESSAGING_GATEWAY_RESTART_MAX_ATTEMPTS = "2";

  const rootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "managed-messaging-gateway-service-"),
  );
  tempDirs.push(rootDir);

  const installerService = {
    getManagedRoot: () => path.join(rootDir, "managed"),
    getConfigRoot: () => path.join(rootDir, "config"),
    getLogsRoot: () => path.join(rootDir, "logs"),
    getRuntimeDataRoot: () => path.join(rootDir, "runtime-data"),
    getVersionInstallDir: (version: string) => path.join(rootDir, "versions", version),
  };
  const processSupervisor = {
    runtimeSnapshot: { ...input.runtimeSnapshot },
    onExit: vi.fn(),
    getRuntimeSnapshot: vi.fn(() => ({ ...processSupervisor.runtimeSnapshot })),
    isRunning: vi.fn(() => processSupervisor.runtimeSnapshot.running),
    stop: vi.fn(async () => {
      processSupervisor.runtimeSnapshot = {
        ...processSupervisor.runtimeSnapshot,
        running: false,
        pid: null,
      };
    }),
  };
  const adminClient = {
    getRuntimeReliabilityStatus: vi.fn().mockImplementation(async () => {
      if (input.runtimeReliabilityStatus === null) {
        return null;
      }
      return input.runtimeReliabilityStatus;
    }),
  };

  const service = new ManagedMessagingGatewayService({
    manifestService: {} as any,
    installerService: installerService as any,
    processSupervisor: processSupervisor as any,
    adminClient: adminClient as any,
  }) as any;
  const storage = service.storage;
  await storage.ensureRoots();
  await storage.writeState({
    desiredEnabled: true,
    lifecycleState: "RUNNING",
    message: "Managed messaging gateway is running.",
    lastError: null,
    activeVersion: "1.0.0",
    desiredVersion: "1.0.0",
    releaseTag: "release-1",
    bindHost: "127.0.0.1",
    bindPort: 8010,
    pid: 4321,
    preferredBindPort: 8010,
    adminToken: "secret",
  });

  return {
    service,
    storage,
    adminClient,
    installerService,
    processSupervisor,
  };
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
