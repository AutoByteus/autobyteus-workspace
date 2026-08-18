import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";

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
    loggerWarn: vi.fn(),
    scheduleBackgroundTasks: vi.fn(async () => undefined),
    startChannelRuntime: vi.fn(),
    startGatewayRuntime: vi.fn(),
    restoreManagedMessaging: vi.fn(async () => undefined),
    getOrCreateTempWorkspace: vi.fn(async () => undefined),
    rebuildTeamRunCatalog: vi.fn(async () => undefined),
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
  getAppDataMigrationRunner: () => ({
    runPending: mocks.runPending,
    listStatuses: vi.fn(),
  }),
}));
vi.mock("../../src/run-history/services/team-run-v1-package-catalog.js", () => ({
  TeamRunV1PackageCatalog: class {
    rebuild = mocks.rebuildTeamRunCatalog;
  },
}));
vi.mock("../../src/app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.js", () => ({
  CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID: "20260803_custom_provider_readable_identity",
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
      getMemoryDir: () => "/tmp/server-runtime-gate/memory",
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
  initializeRuntimeLoggerBootstrap: vi.fn(() => ({
    logFilePath: "/tmp/server-runtime-gate/logs/server.log",
  })),
}));
vi.mock("../../src/logging/server-app-logger.js", () => ({
  createServerLogger: () => ({
    info: vi.fn(),
    error: mocks.loggerError,
    warn: mocks.loggerWarn,
    debug: vi.fn(),
  }),
  initializeServerAppLogger: vi.fn(),
}));

import { startConfiguredServer } from "../../src/server-runtime.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";

describe("startConfiguredServer required app-data migration gates", () => {
  const finalSuccess = {
    migrationId: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
    status: "SUCCEEDED",
    logPath: "/tmp/server-runtime-gate/team-run-v1.log",
  };
  const readableSuccess = {
    migrationId: "20260803_custom_provider_readable_identity",
    status: "SUCCEEDED",
    logPath: "/tmp/server-runtime-gate/readable.log",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runPending.mockResolvedValue([finalSuccess, readableSuccess]);
  });

  const expectStartupBlocked = () => {
    expect(mocks.app.listen).not.toHaveBeenCalled();
    expect(mocks.bootstrapBuiltInAgents).not.toHaveBeenCalled();
    expect(mocks.fastify).not.toHaveBeenCalled();
    expect(mocks.scheduleBackgroundTasks).not.toHaveBeenCalled();
  };

  const expectControlledExit = async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    try {
      await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 }))
        .rejects.toThrow("process.exit:1");
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      exit.mockRestore();
    }
  };

  const expectAppDataStartupPlatformFatal = async (summaryDetail: string) => {
    const writeSync = vi.spyOn(fs, "writeSync").mockImplementation(() => 0);
    try {
      await expectControlledExit();
      expect(writeSync).toHaveBeenCalledWith(
        process.stderr.fd,
        `${JSON.stringify({
          protocol: "autobyteus.embedded-server.platform-fatal.v1",
          code: "APP_DATA_STARTUP_GATE_FAILED",
          summary: `Failed to run app data migrations: ${summaryDetail}`,
          logPath: "/tmp/server-runtime-gate/logs/server.log",
        })}\n`,
        null,
        "utf8",
      );
    } finally {
      writeSync.mockRestore();
    }
  };

  it("continues bootstrap and listen when final TeamRun migration reports a warning", async () => {
    mocks.runPending.mockResolvedValueOnce([{
      migrationId: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
      status: "SUCCEEDED_WITH_WARNINGS",
      displayName: "TeamRun execution-tree V1 migration",
      attempts: 1,
      summary: { failedCount: 1 },
      errorMessage: "identity mismatch",
      logPath: "/tmp/team-run-v1-warning.log",
    }, readableSuccess]);

    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 })).resolves.toBeUndefined();

    expect(mocks.runDatabaseMigrations).toHaveBeenCalledTimes(1);
    expect(mocks.configureDeniedPaths).toHaveBeenCalledWith([
      "/tmp/server-runtime-gate/test.db",
      "/tmp/server-runtime-gate/root.key",
      "/tmp/server-runtime-gate/test.db-wal",
      "/tmp/server-runtime-gate/test.db-shm",
      "/tmp/server-runtime-gate/test.db-journal",
    ]);
    expect(mocks.initializePrisma).toHaveBeenCalledWith({ datasourceUrl: "file:/tmp/server-runtime-gate/test.db" });
    expect(mocks.initializeSecretVault).toHaveBeenCalledTimes(1);
    expect(mocks.runPending).toHaveBeenCalledTimes(1);
    expect(mocks.rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
    expect(mocks.bootstrapBuiltInAgents).toHaveBeenCalledTimes(1);
    expect(mocks.app.listen).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(expect.stringContaining(
      TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
    ));
  });

  it("continues with strict catalog admission when the final status is missing", async () => {
    mocks.runPending.mockResolvedValueOnce([readableSuccess]);
    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 })).resolves.toBeUndefined();
    expect(mocks.bootstrapBuiltInAgents).toHaveBeenCalledTimes(1);
    expect(mocks.app.listen).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(expect.stringContaining('"status":"MISSING"'));
  });

  it("emits a narrow structured platform fatal before database bootstrap exits", async () => {
    mocks.initializePrisma.mockRejectedValueOnce(new Error("database schema is unavailable"));
    const writeSync = vi.spyOn(fs, "writeSync").mockImplementation(() => 0);
    try {
      await expectControlledExit();
      expectStartupBlocked();
      expect(writeSync).toHaveBeenCalledWith(
        process.stderr.fd,
        expect.stringContaining(
          '"protocol":"autobyteus.embedded-server.platform-fatal.v1","code":"APPLICATION_DATABASE_INITIALIZATION_FAILED"',
        ),
        null,
        "utf8",
      );
      expect(writeSync).toHaveBeenCalledWith(
        process.stderr.fd,
        expect.stringContaining('"logPath":"/tmp/server-runtime-gate/logs/server.log"'),
        null,
        "utf8",
      );
    } finally {
      writeSync.mockRestore();
    }
  });

  it("blocks bootstrap and listen when migration execution throws", async () => {
    mocks.runPending.mockRejectedValueOnce(new Error("migration state store unavailable"));
    await expectAppDataStartupPlatformFatal("Error: migration state store unavailable");
    expectStartupBlocked();
    expect(mocks.loggerError).toHaveBeenCalledWith(expect.stringContaining("Failed to run app data migrations"));
  });

  it("blocks startup when readable identity has a non-terminal failure", async () => {
    mocks.runPending.mockResolvedValueOnce([finalSuccess, {
      migrationId: "20260803_custom_provider_readable_identity",
      status: "FAILED",
      logPath: "/tmp/server-runtime-gate/readable-failed.log",
    }]);
    await expectAppDataStartupPlatformFatal(
      "Error: CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:FAILED:/tmp/server-runtime-gate/readable-failed.log",
    );
    expectStartupBlocked();
    expect(mocks.loggerError).toHaveBeenCalledWith(expect.stringContaining(
      "CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:FAILED:/tmp/server-runtime-gate/readable-failed.log",
    ));
  });

  it("blocks startup when the readable identity result is missing", async () => {
    mocks.runPending.mockResolvedValueOnce([finalSuccess]);
    await expectAppDataStartupPlatformFatal(
      "Error: CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:NOT_RUN:NO_LOG",
    );
    expectStartupBlocked();
    expect(mocks.loggerError).toHaveBeenCalledWith(expect.stringContaining(
      "CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:NOT_RUN:NO_LOG",
    ));
  });

  it("blocks startup when readable identity is still RUNNING and preserves its log path", async () => {
    mocks.runPending.mockResolvedValueOnce([finalSuccess, {
      migrationId: "20260803_custom_provider_readable_identity",
      status: "RUNNING",
      logPath: "/tmp/server-runtime-gate/readable-running.log",
    }]);
    await expectAppDataStartupPlatformFatal(
      "Error: CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:RUNNING:/tmp/server-runtime-gate/readable-running.log",
    );
    expectStartupBlocked();
    expect(mocks.loggerError).toHaveBeenCalledWith(expect.stringContaining(
      "CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:RUNNING:/tmp/server-runtime-gate/readable-running.log",
    ));
  });

  it("continues when both blocking migrations are terminal despite an unrelated failure", async () => {
    mocks.runPending.mockResolvedValueOnce([
      finalSuccess,
      { ...readableSuccess, status: "SUCCEEDED_WITH_WARNINGS" },
      { migrationId: "unrelated_best_effort_migration", status: "FAILED" },
    ]);
    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 })).resolves.toBeUndefined();
    expect(mocks.runPending.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0]!);
    expect(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.bootstrapBuiltInAgents.mock.invocationCallOrder[0]!);
    expect(mocks.bootstrapBuiltInAgents).toHaveBeenCalledTimes(1);
    expect(mocks.fastify).toHaveBeenCalledTimes(1);
    expect(mocks.app.listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 0 });
    expect(mocks.scheduleBackgroundTasks).toHaveBeenCalledTimes(1);
  });

  it("starts exactly once when all blocking migrations succeed", async () => {
    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 })).resolves.toBeUndefined();
    expect(mocks.bootstrapBuiltInAgents).toHaveBeenCalledTimes(1);
    expect(mocks.rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
    expect(mocks.fastify).toHaveBeenCalledTimes(1);
    expect(mocks.app.listen).toHaveBeenCalledTimes(1);
    expect(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.app.listen.mock.invocationCallOrder[0]!);
    expect(mocks.scheduleBackgroundTasks).toHaveBeenCalledTimes(1);
  });
});
