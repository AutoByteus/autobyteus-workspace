import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ApplicationPlatformLifecycle } from "../../../src/application-platform/runtime/application-platform-lifecycle.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationProviderCredentialReadinessAdapter } from "../../../src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createDependencies = () => ({
  preparation: {
    prepareWorkspaceRuntime: vi.fn(async () => undefined),
    prepareAgentCustomizations: vi.fn(async () => undefined),
    toolReadiness: { registerRequiredGroups: vi.fn(async () => undefined) },
    bootstrapBuiltInAgents: vi.fn(async () => undefined),
    definitionRuntimeReadiness: {
      prepare: vi.fn(async () => undefined),
      isApplicationReady: vi.fn(() => true),
      getDiagnosticsByApplicationId: vi.fn(() => new Map()),
    },
  },
  executionReadiness: { assertReady: vi.fn() },
  bundleService: {
    getCatalogSnapshot: vi.fn(async () => ({
      applications: [
        { id: "selected-app" },
        { id: "dormant-app" },
      ],
      diagnostics: [],
      refreshedAt: "2026-07-29T10:00:00.000Z",
    })),
  },
  storageLifecycleService: {
    ensureRuntimeDirectoryPrepared: vi.fn(async () => undefined),
  },
  platformStateStore: {
    listKnownApplicationIds: vi.fn(async () => ["dormant-app", "selected-app"]),
  },
  recoveryService: {
    resumeBindings: vi.fn(async () => [{
      applicationId: "selected-app",
      status: "RECOVERED",
      detail: null,
    }]),
  },
  availabilityService: {
    reconcileCatalogSnapshotWithKnownApplications: vi.fn(),
    quarantineApplication: vi.fn(),
  },
  eventDispatchService: {
    resumePendingEventsForApplication: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  },
  startupGate: {
    runStartupRecovery: vi.fn(async (work: () => Promise<void>) => work()),
  },
  selectedApplicationIds: new Set(["selected-app"]),
  agentCommunicationService: { closeAll: vi.fn(async () => undefined) },
  backendGateway: { dispose: vi.fn() },
  backendWebSocketSessionService: { dispose: vi.fn() },
  notificationHub: { closeAll: vi.fn() },
  runObserverService: { dispose: vi.fn(async () => undefined) },
  artifactDeliveryService: {
    stopAccepting: vi.fn(),
    awaitDrained: vi.fn(async () => undefined),
  },
  engineLauncher: { stopAll: vi.fn(async () => undefined) },
  executionLifecycle: {
    quiesce: vi.fn(),
    close: vi.fn(async () => undefined),
  },
  streamingService: { stopAll: vi.fn(async () => undefined) },
});

describe("ApplicationPlatformLifecycle", () => {
  it("awaits named readiness and recovers only the selected canonical application", async () => {
    const dependencies = createDependencies();
    const lifecycle = new ApplicationPlatformLifecycle(dependencies as never);

    await lifecycle.prepareBeforeListen();
    expect(lifecycle.getState()).toBe("waiting_for_listener");
    expect(dependencies.preparation.prepareWorkspaceRuntime).toHaveBeenCalledBefore(
      dependencies.preparation.prepareAgentCustomizations,
    );
    expect(dependencies.preparation.prepareAgentCustomizations).toHaveBeenCalledBefore(
      dependencies.preparation.toolReadiness.registerRequiredGroups,
    );
    expect(
      dependencies.executionReadiness.assertReady,
    ).toHaveBeenCalledAfter(
      dependencies.preparation.toolReadiness.registerRequiredGroups,
    );
    expect(
      dependencies.storageLifecycleService.ensureRuntimeDirectoryPrepared,
    ).toHaveBeenCalledExactlyOnceWith("selected-app");
    expect(
      dependencies.storageLifecycleService.ensureRuntimeDirectoryPrepared,
    ).toHaveBeenCalledBefore(
      dependencies.preparation.definitionRuntimeReadiness.prepare,
    );
    expect(dependencies.preparation.definitionRuntimeReadiness.prepare).toHaveBeenCalledTimes(1);

    await lifecycle.recoverAfterListen();
    expect(lifecycle.getState()).toBe("ready");
    expect(dependencies.recoveryService.resumeBindings).toHaveBeenCalledWith(
      expect.objectContaining({
        applications: [{ id: "selected-app" }],
      }),
      ["selected-app"],
    );
    expect(
      dependencies.eventDispatchService.resumePendingEventsForApplication,
    ).toHaveBeenCalledTimes(1);
    expect(
      dependencies.eventDispatchService.resumePendingEventsForApplication,
    ).toHaveBeenCalledWith("selected-app");
    await expect(lifecycle.awaitReady()).resolves.toBeUndefined();
  });

  it("materializes a fresh selected application runtime cwd before definition/provider readiness", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-runtime-readiness-"));
    try {
      const dependencies = createDependencies();
      const storageLifecycleService = new ApplicationStorageLifecycleService({
        appConfig: { getAppDataDir: () => tempRoot },
        applicationBundleService: {
          getApplicationById: vi.fn(async (applicationId: string) =>
            applicationId === "selected-app" ? { id: applicationId } : null),
        } as never,
      });
      const layout = storageLifecycleService.getStorageLayout("selected-app");
      const acquireClient = vi.fn(async (workspaceRootPath: string) => {
        expect(workspaceRootPath).toBe(layout.runtimeDir);
        expect((await fs.stat(workspaceRootPath)).isDirectory()).toBe(true);
        return {
          request: vi.fn(async () => ({ requiresOpenaiAuth: false })),
        };
      });
      const releaseClient = vi.fn(async () => undefined);
      const credentialReadiness = new ApplicationProviderCredentialReadinessAdapter({
        llmProviderService: { getProviderCredentialSetting: vi.fn() } as never,
        codexClientManager: { acquireClient, releaseClient } as never,
      });
      dependencies.storageLifecycleService = storageLifecycleService as never;
      dependencies.preparation.definitionRuntimeReadiness.prepare = vi.fn(async () => {
        const authority = credentialReadiness.resolveAuthority({
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          model: {} as never,
          workspaceRootPath: layout.runtimeDir,
        });
        await expect(credentialReadiness.getReadiness(authority))
          .resolves.toEqual({ configured: true, reason: null });
        await expect(fs.access(layout.platformDatabasePath)).rejects.toThrow();
        await expect(fs.access(layout.appDatabasePath)).rejects.toThrow();
      });
      const lifecycle = new ApplicationPlatformLifecycle(dependencies as never);

      await lifecycle.prepareBeforeListen();

      expect(lifecycle.getState()).toBe("waiting_for_listener");
      expect(
        dependencies.preparation.definitionRuntimeReadiness.prepare,
      ).toHaveBeenCalledTimes(1);
      expect(acquireClient).toHaveBeenCalledExactlyOnceWith(layout.runtimeDir);
      expect(releaseClient).toHaveBeenCalledExactlyOnceWith(layout.runtimeDir);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("keeps full lifecycle cleanup available when runtime directory preparation fails", async () => {
    const dependencies = createDependencies();
    dependencies.storageLifecycleService.ensureRuntimeDirectoryPrepared = vi.fn(
      async () => { throw new Error("runtime directory preparation failed"); },
    );
    const lifecycle = new ApplicationPlatformLifecycle(dependencies as never);

    await expect(lifecycle.prepareBeforeListen()).rejects.toThrow(
      "runtime directory preparation failed",
    );
    expect(lifecycle.getState()).toBe("failed");
    expect(
      dependencies.preparation.definitionRuntimeReadiness.prepare,
    ).not.toHaveBeenCalled();

    await expect(lifecycle.stop()).resolves.toBeUndefined();
    expect(lifecycle.getState()).toBe("stopped");
    expect(
      dependencies.executionLifecycle.quiesce,
    ).toHaveBeenCalledTimes(1);
    expect(dependencies.engineLauncher.stopAll).toHaveBeenCalledTimes(1);
    expect(dependencies.executionLifecycle.close).toHaveBeenCalledTimes(1);
  });

  it("stops all owned boundaries in order, remains idempotent, and reports cleanup failures after continuing", async () => {
    const dependencies = createDependencies();
    const order: string[] = [];
    const record = (name: string, error?: Error) => vi.fn(async () => {
      order.push(name);
      if (error) throw error;
    });
    dependencies.eventDispatchService.stop = record("events");
    dependencies.executionLifecycle.quiesce =
      vi.fn(() => order.push("execution-quiesce"));
    dependencies.agentCommunicationService.closeAll = record("communication");
    dependencies.backendGateway.dispose = record("gateway") as never;
    dependencies.backendWebSocketSessionService.dispose = record(
      "backend-websockets",
      new Error("backend websocket cleanup failed"),
    ) as never;
    dependencies.notificationHub.closeAll = record("notifications") as never;
    dependencies.runObserverService.dispose = record("observers");
    dependencies.artifactDeliveryService.stopAccepting =
      vi.fn(() => order.push("artifact-intake-stop"));
    dependencies.artifactDeliveryService.awaitDrained = record("artifact-drain");
    dependencies.engineLauncher.stopAll = record("workers");
    dependencies.executionLifecycle.close = record(
      "execution-close",
      new Error("runtime run shutdown failed"),
    );
    dependencies.streamingService.stopAll = record("streaming");
    const lifecycle = new ApplicationPlatformLifecycle(dependencies as never);

    await expect(lifecycle.stop()).rejects.toMatchObject({
      name: "AggregateError",
      message: "Application platform lifecycle cleanup failed.",
    });
    expect(order).toEqual([
      "execution-quiesce",
      "events",
      "communication",
      "gateway",
      "backend-websockets",
      "notifications",
      "artifact-intake-stop",
      "artifact-drain",
      "observers",
      "workers",
      "execution-close",
      "streaming",
    ]);
    expect(lifecycle.getState()).toBe("stopped");

    await expect(lifecycle.stop()).rejects.toMatchObject({
      name: "AggregateError",
    });
    expect(order).toHaveLength(12);
  });
});
