import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const app = {
    listen: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
    addHook: vi.fn(),
    get: vi.fn(),
    server: {
      address: vi.fn(() => ({ address: "127.0.0.1", family: "IPv4", port: 43210 })),
    },
  };
  return {
    app,
    fastify: vi.fn(() => app),
    initializePrisma: vi.fn(async () => undefined),
    runDatabaseMigrations: vi.fn(),
    runPending: vi.fn(),
    bootstrapBuiltInAgents: vi.fn(),
    initializeSecretVault: vi.fn(async () => undefined),
    configureDeniedPaths: vi.fn(),
    loggerError: vi.fn(),
    scheduleBackgroundTasks: vi.fn(async () => undefined),
    startChannelRuntime: vi.fn(),
    startGatewayRuntime: vi.fn(),
    restoreManagedMessaging: vi.fn(async () => undefined),
    getOrCreateTempWorkspace: vi.fn(async () => undefined),
    runStartupRecovery: vi.fn(async (callback: () => Promise<void>) => callback()),
    resumeBindings: vi.fn(async () => []),
    resumePendingEvents: vi.fn(async () => undefined),
    reconcileAvailability: vi.fn(),
  };
});

vi.mock("fastify", () => ({ default: mocks.fastify }));
vi.mock("repository_prisma", async (importOriginal) => ({
  ...await importOriginal<typeof import("repository_prisma")>(),
  initializePrisma: mocks.initializePrisma,
  shutdownPrisma: vi.fn(),
}));
vi.mock("../../src/startup/migrations.js", () => ({
  runMigrations: mocks.runDatabaseMigrations,
}));
vi.mock("../../src/startup/background-runner.js", () => ({
  scheduleBackgroundTasks: mocks.scheduleBackgroundTasks,
}));
vi.mock("../../src/api/rest/index.js", () => ({ registerRestRoutes: vi.fn() }));
vi.mock("../../src/api/graphql/index.js", () => ({ registerGraphql: vi.fn() }));
vi.mock("../../src/api/websocket/index.js", () => ({ registerWebsocketRoutes: vi.fn() }));
vi.mock("../../src/agent-tools/mcp/agent-tools-mcp-routes.js", () => ({
  registerAgentToolsMcpRoutes: vi.fn(),
}));
vi.mock("../../src/mcp-gateway/mcp-gateway-routes.js", () => ({
  registerMcpGatewayRoutes: vi.fn(),
}));
vi.mock("../../src/api/security/remote-access-policy-plugin.js", () => ({
  registerRemoteAccessPolicyPlugin: vi.fn(),
}));
vi.mock("../../src/api/static/mobile-web.js", () => ({ registerMobileWebStaticRoutes: vi.fn() }));
vi.mock("../../src/agent-tools/search/register-search-tool.js", () => ({
  registerProvisionedSearchTool: vi.fn(),
}));
vi.mock("../../src/logging/http-access-log-policy.js", () => ({
  registerHttpAccessLogPolicy: vi.fn(),
}));
vi.mock("../../src/external-channel/runtime/channel-run-output-runtime-singleton.js", () => ({
  startChannelRunOutputDeliveryRuntime: mocks.startChannelRuntime,
  stopChannelRunOutputDeliveryRuntime: vi.fn(),
}));
vi.mock("../../src/external-channel/runtime/gateway-callback-delivery-runtime.js", () => ({
  startGatewayCallbackDeliveryRuntime: mocks.startGatewayRuntime,
  stopGatewayCallbackDeliveryRuntime: vi.fn(),
}));
vi.mock("../../src/managed-capabilities/messaging-gateway/defaults.js", () => ({
  getManagedMessagingGatewayService: () => ({
    restoreIfEnabled: mocks.restoreManagedMessaging,
    close: vi.fn(),
  }),
}));
vi.mock("../../src/workspaces/workspace-manager.js", () => ({
  getWorkspaceManager: () => ({ getOrCreateTempWorkspace: mocks.getOrCreateTempWorkspace }),
}));
vi.mock("../../src/application-packages/services/application-package-registry-service.js", () => ({
  ApplicationPackageRegistryService: {
    getInstance: () => ({ getRegistrySnapshot: vi.fn(async () => ({ packages: [] })) }),
  },
}));
vi.mock("../../src/application-bundles/services/application-bundle-service.js", () => ({
  ApplicationBundleService: {
    getInstance: () => ({ getCatalogSnapshot: vi.fn(async () => ({ applications: [] })) }),
  },
}));
vi.mock("../../src/application-storage/stores/application-platform-state-store.js", () => ({
  ApplicationPlatformStateStore: class {
    listKnownApplicationIds = vi.fn(async () => []);
  },
}));
vi.mock("../../src/application-orchestration/services/application-availability-service.js", () => ({
  getApplicationAvailabilityService: () => ({
    reconcileCatalogSnapshotWithKnownApplications: mocks.reconcileAvailability,
  }),
}));
vi.mock("../../src/application-orchestration/services/application-orchestration-startup-gate.js", () => ({
  getApplicationOrchestrationStartupGate: () => ({ runStartupRecovery: mocks.runStartupRecovery }),
}));
vi.mock("../../src/application-orchestration/services/application-orchestration-recovery-service.js", () => ({
  getApplicationOrchestrationRecoveryService: () => ({ resumeBindings: mocks.resumeBindings }),
}));
vi.mock("../../src/application-orchestration/services/application-execution-event-dispatch-service.js", () => ({
  getApplicationExecutionEventDispatchService: () => ({
    resumePendingEvents: mocks.resumePendingEvents,
  }),
}));
vi.mock("../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => ({ runPending: mocks.runPending }),
}));
vi.mock("../../src/built-in-agents/built-in-agent-bootstrapper.js", () => ({
  bootstrapBuiltInAgents: mocks.bootstrapBuiltInAgents,
}));
vi.mock("../../src/secret-management/secret-vault-runtime.js", () => ({
  getSecretVaultRuntime: () => ({
    initialize: mocks.initializeSecretVault,
    close: vi.fn(),
  }),
}));
vi.mock("autobyteus-ts/tools/file/workspace-path-utils.js", () => ({
  configureFileToolDeniedPaths: mocks.configureDeniedPaths,
}));
vi.mock("../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getLogsDir: () => "/tmp/server-runtime-gate/logs",
      getAppRootDir: () => "/tmp/server-runtime-gate",
      getOperationalDatabaseUrl: () => "file:/tmp/server-runtime-gate/test.db",
      get: vi.fn(() => undefined),
      getOperationalDatabaseLocation: () => ({
        databasePath: "/tmp/server-runtime-gate/test.db",
        rootKeyPath: "/tmp/server-runtime-gate/root.key",
        databaseUrl: "file:/tmp/server-runtime-gate/test.db",
      }),
    },
  },
}));
vi.mock("../../src/config/logging-config.js", () => ({
  getLoggingConfigFromEnv: () => ({
    level: "silent",
    httpAccessLogMode: "off",
    includeNoisyHttpAccessRoutes: false,
  }),
}));
vi.mock("../../src/logging/runtime-logger-bootstrap.js", () => ({
  getFastifyLoggerOptions: vi.fn(() => false),
  initializeRuntimeLoggerBootstrap: vi.fn(),
}));
vi.mock("../../src/logging/server-app-logger.js", () => ({
  createServerLogger: () => ({
    info: vi.fn(),
    error: mocks.loggerError,
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  initializeServerAppLogger: vi.fn(),
}));

import { startConfiguredServer } from "../../src/server-runtime.js";

describe("startConfiguredServer ordinary app-data migration execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runPending.mockResolvedValue([]);
  });

  it("continues bootstrap, app construction, and listen when the runner reports a FAILED result", async () => {
    mocks.runPending.mockResolvedValueOnce([
      {
        migrationId: "migrate_native_working_context_snapshots_v5",
        status: "FAILED",
        details: { diagnostics: [{ status: "FAILED", reason: "identity mismatch" }] },
      },
    ]);

    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 })).resolves.toBeUndefined();

    expect(mocks.runDatabaseMigrations).toHaveBeenCalledTimes(1);
    expect(mocks.configureDeniedPaths).toHaveBeenCalledWith([
      "/tmp/server-runtime-gate/test.db",
      "/tmp/server-runtime-gate/root.key",
      "/tmp/server-runtime-gate/test.db-wal",
      "/tmp/server-runtime-gate/test.db-shm",
      "/tmp/server-runtime-gate/test.db-journal",
    ]);
    expect(mocks.initializePrisma).toHaveBeenCalledWith({
      datasourceUrl: "file:/tmp/server-runtime-gate/test.db",
    });
    expect(mocks.initializeSecretVault).toHaveBeenCalledTimes(1);
    expect(mocks.runPending).toHaveBeenCalledTimes(1);
    expect(mocks.bootstrapBuiltInAgents).toHaveBeenCalledTimes(1);
    expect(mocks.fastify).toHaveBeenCalledTimes(1);
    expect(mocks.app.listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 0 });
    expect(mocks.scheduleBackgroundTasks).toHaveBeenCalledTimes(1);
    expect(mocks.loggerError).not.toHaveBeenCalledWith(
      expect.stringContaining("Failed to run app data migrations"),
    );
  });

  it("logs an infrastructure exception from the runner and still starts", async () => {
    const runnerFailure = new Error("migration state store unavailable");
    mocks.runPending.mockRejectedValueOnce(runnerFailure);

    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 })).resolves.toBeUndefined();

    expect(mocks.runPending).toHaveBeenCalledTimes(1);
    expect(mocks.bootstrapBuiltInAgents).toHaveBeenCalledTimes(1);
    expect(mocks.fastify).toHaveBeenCalledTimes(1);
    expect(mocks.app.listen).toHaveBeenCalledTimes(1);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to run app data migrations"),
    );
  });
});
