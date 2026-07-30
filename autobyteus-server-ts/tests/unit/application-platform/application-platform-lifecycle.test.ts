import { describe, expect, it, vi } from "vitest";
import { ApplicationPlatformLifecycle } from "../../../src/application-platform/runtime/application-platform-lifecycle.js";

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
    agentToolsSessionManager: {
      assertReady: vi.fn(),
      blockNewSessions: vi.fn(),
      close: vi.fn(),
    },
    publishedArtifactPublisher: {
      close: vi.fn(),
    },
  },
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
  engineHostService: { stopAllApplicationEngines: vi.fn(async () => undefined) },
  runShutdownCoordinator: { stopAllRuns: vi.fn(async () => undefined) },
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
      dependencies.preparation.agentToolsSessionManager.assertReady,
    ).toHaveBeenCalledAfter(
      dependencies.preparation.toolReadiness.registerRequiredGroups,
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

  it("stops all owned boundaries in order, remains idempotent, and reports cleanup failures after continuing", async () => {
    const dependencies = createDependencies();
    const order: string[] = [];
    const record = (name: string, error?: Error) => vi.fn(async () => {
      order.push(name);
      if (error) throw error;
    });
    dependencies.eventDispatchService.stop = record("events");
    dependencies.preparation.agentToolsSessionManager.blockNewSessions =
      vi.fn(() => order.push("session-block"));
    dependencies.agentCommunicationService.closeAll = record("communication");
    dependencies.backendGateway.dispose = record("gateway") as never;
    dependencies.backendWebSocketSessionService.dispose = record(
      "backend-websockets",
      new Error("backend websocket cleanup failed"),
    ) as never;
    dependencies.notificationHub.closeAll = record("notifications") as never;
    dependencies.runObserverService.dispose = record("observers");
    dependencies.engineHostService.stopAllApplicationEngines = record("workers");
    dependencies.runShutdownCoordinator.stopAllRuns = record(
      "runs",
      new Error("runtime run shutdown failed"),
    );
    dependencies.preparation.agentToolsSessionManager.close =
      record("sessions") as never;
    dependencies.preparation.publishedArtifactPublisher.close =
      record("publication") as never;
    dependencies.streamingService.stopAll = record("streaming");
    const lifecycle = new ApplicationPlatformLifecycle(dependencies as never);

    await expect(lifecycle.stop()).rejects.toMatchObject({
      name: "AggregateError",
      message: "Application platform lifecycle cleanup failed.",
    });
    expect(order).toEqual([
      "session-block",
      "events",
      "communication",
      "gateway",
      "backend-websockets",
      "notifications",
      "observers",
      "workers",
      "runs",
      "sessions",
      "publication",
      "streaming",
    ]);
    expect(lifecycle.getState()).toBe("stopped");

    await expect(lifecycle.stop()).rejects.toMatchObject({
      name: "AggregateError",
    });
    expect(order).toHaveLength(12);
  });
});
