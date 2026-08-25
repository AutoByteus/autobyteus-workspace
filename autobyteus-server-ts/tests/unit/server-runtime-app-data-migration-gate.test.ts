import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const READABLE_MIGRATION_ID = "20260803_custom_provider_readable_identity";

const mocks = vi.hoisted(() => {
  const app = {
    listen: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    server: {
      address: vi.fn(() => ({ address: "127.0.0.1", family: "IPv4", port: 43210 })),
    },
  };
  const lifecycle = {
    prepareBeforeListen: vi.fn(async () => undefined),
    recoverAfterListen: vi.fn(async () => undefined),
  };
  return {
    app,
    lifecycle,
    buildStudioServer: vi.fn(async () => ({
      fastify: app,
      applicationRuntime: { lifecycle },
      packageRegistryService: {},
    })),
    initializePrisma: vi.fn(async () => undefined),
    shutdownPrisma: vi.fn(async () => undefined),
    runDatabaseMigrations: vi.fn(),
    assertTokenUsageCurrentSchema: vi.fn(async () => undefined),
    configureTokenUsageMigrationReadiness: vi.fn(),
    runPending: vi.fn(),
    rebuildTeamRunCatalog: vi.fn(async () => undefined),
    initializeSecretVault: vi.fn(async () => undefined),
    closeSecretVault: vi.fn(async () => undefined),
    configureDeniedPaths: vi.fn(),
    loggerError: vi.fn(),
    loggerWarn: vi.fn(),
    scheduleStudioBackgroundTasks: vi.fn(async () => undefined),
    startChannelRuntime: vi.fn(),
    startGatewayRuntime: vi.fn(),
    restoreManagedMessaging: vi.fn(async () => undefined),
  };
});

vi.mock("repository_prisma", async (importOriginal) => ({
  ...await importOriginal<typeof import("repository_prisma")>(),
  initializePrisma: mocks.initializePrisma,
  shutdownPrisma: mocks.shutdownPrisma,
}));
vi.mock("../../src/startup/migrations.js", () => ({
  runMigrations: mocks.runDatabaseMigrations,
}));
vi.mock("../../src/startup/token-usage-current-schema-readiness.js", () => ({
  assertTokenUsageCurrentSchema: mocks.assertTokenUsageCurrentSchema,
}));
vi.mock("../../src/token-usage/providers/token-usage-migration-readiness.js", () => ({
  TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID: "20260801_token_usage_run_records_v1",
  configureTokenUsageMigrationReadiness: mocks.configureTokenUsageMigrationReadiness,
}));
vi.mock("../../src/startup/background-runner.js", () => ({
  scheduleStudioBackgroundTasks: mocks.scheduleStudioBackgroundTasks,
}));
vi.mock("../../src/compositions/build-studio-server.js", () => ({
  buildStudioServer: mocks.buildStudioServer,
}));
vi.mock("../../src/external-channel/runtime/channel-run-output-runtime-singleton.js", () => ({
  startChannelRunOutputDeliveryRuntime: mocks.startChannelRuntime,
}));
vi.mock("../../src/external-channel/runtime/gateway-callback-delivery-runtime.js", () => ({
  startGatewayCallbackDeliveryRuntime: mocks.startGatewayRuntime,
}));
vi.mock("../../src/managed-capabilities/messaging-gateway/defaults.js", () => ({
  getManagedMessagingGatewayService: () => ({
    restoreIfEnabled: mocks.restoreManagedMessaging,
  }),
}));
vi.mock("../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => ({ runPending: mocks.runPending }),
}));
vi.mock("../../src/run-history/services/team-run-package-catalog.js", () => ({
  TeamRunPackageCatalog: class {
    rebuild = mocks.rebuildTeamRunCatalog;
  },
}));
vi.mock("../../src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js", () => ({
  TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID: "20260824_team_run_execution_tree_v2",
}));
vi.mock("../../src/app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.js", () => ({
  CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID: "20260803_custom_provider_readable_identity",
}));
vi.mock("../../src/secret-management/secret-vault-runtime.js", () => ({
  getSecretVaultRuntime: () => ({
    initialize: mocks.initializeSecretVault,
    close: mocks.closeSecretVault,
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

const terminalReadableStatus = (status: "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS") => ({
  migrationId: READABLE_MIGRATION_ID,
  status,
  logPath: "/tmp/server-runtime-gate/readable.log",
});

describe("Studio readable-provider migration startup gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "once").mockReturnValue(process);
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    mocks.runPending.mockResolvedValue([terminalReadableStatus("SUCCEEDED")]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"] as const)(
    "builds and listens only after readable identity status %s",
    async (status) => {
      mocks.runPending.mockResolvedValueOnce([terminalReadableStatus(status)]);

      await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 }))
        .resolves.toBeUndefined();

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
      expect(mocks.assertTokenUsageCurrentSchema.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.initializeSecretVault.mock.invocationCallOrder[0]!);
      expect(mocks.runPending.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0]!);
      expect(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.buildStudioServer.mock.invocationCallOrder[0]!);
      expect(mocks.buildStudioServer).toHaveBeenCalledTimes(1);
      expect(mocks.lifecycle.prepareBeforeListen.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.app.listen.mock.invocationCallOrder[0]!);
      expect(mocks.app.listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 0 });
      expect(mocks.lifecycle.recoverAfterListen).toHaveBeenCalledTimes(1);
      expect(mocks.scheduleStudioBackgroundTasks).toHaveBeenCalledTimes(1);
      expect(mocks.closeSecretVault).not.toHaveBeenCalled();
      expect(mocks.shutdownPrisma).not.toHaveBeenCalled();
    },
  );

  it("retains the warning-only policy for an unrelated ordinary migration failure", async () => {
    mocks.runPending.mockResolvedValueOnce([
      {
        migrationId: "ordinary_optional_migration",
        status: "FAILED",
        errorMessage: "identity mismatch",
      },
      terminalReadableStatus("SUCCEEDED_WITH_WARNINGS"),
    ]);

    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 }))
      .resolves.toBeUndefined();

    expect(mocks.loggerWarn).toHaveBeenCalledWith(expect.stringContaining(
      "Studio app-data migration 'ordinary_optional_migration' is FAILED: identity mismatch",
    ));
    expect(mocks.buildStudioServer).toHaveBeenCalledTimes(1);
    expect(mocks.app.listen).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing", [], "NOT_RUN", "NO_LOG"],
    ["running", [{ migrationId: READABLE_MIGRATION_ID, status: "RUNNING", logPath: "/tmp/running.log" }], "RUNNING", "/tmp/running.log"],
    ["failed", [{ migrationId: READABLE_MIGRATION_ID, status: "FAILED", logPath: "/tmp/failed.log" }], "FAILED", "/tmp/failed.log"],
  ] as const)(
    "blocks %s readable identity state before composition construction and unwinds process resources",
    async (_label, statuses, expectedStatus, expectedLogPath) => {
      mocks.runPending.mockResolvedValueOnce(statuses);

      await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 }))
        .rejects.toThrow("process.exit:1");

      expect(mocks.buildStudioServer).not.toHaveBeenCalled();
      expect(mocks.lifecycle.prepareBeforeListen).not.toHaveBeenCalled();
      expect(mocks.app.listen).not.toHaveBeenCalled();
      expect(mocks.closeSecretVault).toHaveBeenCalledTimes(1);
      expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
      expect(mocks.loggerError).toHaveBeenCalledWith(expect.stringContaining(
        `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:${expectedStatus}:${expectedLogPath}`,
      ));
    },
  );

  it("blocks a migration runner exception before composition construction and unwinds process resources", async () => {
    const runnerFailure = new Error("migration state store unavailable");
    mocks.runPending.mockRejectedValueOnce(runnerFailure);

    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 }))
      .rejects.toThrow("process.exit:1");

    expect(mocks.buildStudioServer).not.toHaveBeenCalled();
    expect(mocks.app.listen).not.toHaveBeenCalled();
    expect(mocks.closeSecretVault).toHaveBeenCalledTimes(1);
    expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
    expect(mocks.loggerError).toHaveBeenCalledWith(expect.stringContaining(
      runnerFailure.message,
    ));
  });
});
