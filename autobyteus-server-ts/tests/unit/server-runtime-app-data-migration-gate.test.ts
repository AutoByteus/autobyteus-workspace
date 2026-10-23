const ATTACHMENT_MIGRATION_ID = "20260926_team_context_file_execution_locators_v1";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const READABLE_MIGRATION_ID = "20260803_custom_provider_readable_identity";
const ALL_READY = { token_usage_history: true, custom_llm_providers: true };

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
  const agentToolsMcpHost = {
    listen: vi.fn(async () => "http://127.0.0.1:54321"),
  };
  return {
    app,
    lifecycle,
    agentToolsMcpHost,
    buildStudioServer: vi.fn(async () => ({
      fastify: app,
      applicationRuntime: { lifecycle },
      agentToolsMcpHost,
      packageRegistryService: {},
    })),
    initializePrisma: vi.fn(async () => undefined),
    disableEnvironmentKeySource: vi.fn(),
    shutdownPrisma: vi.fn(async () => undefined),
    runDatabaseMigrations: vi.fn(),
    assertTokenUsageCurrentSchema: vi.fn(async () => undefined),
    configureTokenUsageCapability: vi.fn(),
    runPending: vi.fn(),
    capabilityReadiness: vi.fn(),
    rebuildTeamRunCatalog: vi.fn(async () => undefined),
    initializeSecretVault: vi.fn(async () => undefined),
    closeSecretVault: vi.fn(async () => undefined),
    configureDeniedPaths: vi.fn(),
    loggerError: vi.fn(),
    loggerWarn: vi.fn(),
    scheduleStudioBackgroundTasks: vi.fn(async () => undefined),
  };
});

vi.mock("autobyteus-ts/secrets/provider-api-key-resolver.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("autobyteus-ts/secrets/provider-api-key-resolver.js")>(),
  disableEnvironmentProviderApiKeySource: mocks.disableEnvironmentKeySource,
}));
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
vi.mock("../../src/token-usage/providers/token-usage-capability.js", () => ({
  configureTokenUsageCapability: mocks.configureTokenUsageCapability,
}));
vi.mock("../../src/startup/background-runner.js", () => ({
  scheduleStudioBackgroundTasks: mocks.scheduleStudioBackgroundTasks,
}));
vi.mock("../../src/compositions/build-studio-server.js", () => ({
  buildStudioServer: mocks.buildStudioServer,
}));
vi.mock("../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => ({ runPending: mocks.runPending, capabilityReadiness: mocks.capabilityReadiness }),
}));
vi.mock("../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class {
    rebuild = mocks.rebuildTeamRunCatalog;
  },
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
      getAppDataDir: () => "/tmp/server-runtime-gate",
      get: () => undefined,
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
import { CustomLlmProviderStore } from "../../src/llm-management/llm-providers/stores/custom-llm-provider-store.js";

const terminalReadableStatus = (status: "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS") => ({
  migrationId: READABLE_MIGRATION_ID,
  status,
  logPath: "/tmp/server-runtime-gate/readable.log",
});

describe("Studio app-data migration startup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "once").mockReturnValue(process);
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    mocks.runPending.mockResolvedValue([{ migrationId: ATTACHMENT_MIGRATION_ID, status: "SUCCEEDED" }, terminalReadableStatus("SUCCEEDED")]);
    mocks.capabilityReadiness.mockResolvedValue(ALL_READY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"] as const)(
    "builds and listens only after readable identity status %s",
    async (status) => {
      mocks.runPending.mockResolvedValueOnce([{ migrationId: ATTACHMENT_MIGRATION_ID, status: "SUCCEEDED" }, terminalReadableStatus(status)]);

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
      // AC-018: the server owns its vault; the autobyteus-ts environment default is off first.
      expect(mocks.disableEnvironmentKeySource).toHaveBeenCalledTimes(1);
      expect(mocks.disableEnvironmentKeySource.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.runDatabaseMigrations.mock.invocationCallOrder[0]!);
      expect(mocks.initializeSecretVault).toHaveBeenCalledWith({
        kind: "application",
        location: expect.objectContaining({ databasePath: "/tmp/server-runtime-gate/test.db" }),
      });
      expect(mocks.assertTokenUsageCurrentSchema.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.initializeSecretVault.mock.invocationCallOrder[0]!);
      expect(mocks.runPending.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0]!);
      expect(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.buildStudioServer.mock.invocationCallOrder[0]!);
      expect(mocks.buildStudioServer).toHaveBeenCalledTimes(1);
      expect(mocks.lifecycle.prepareBeforeListen.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.agentToolsMcpHost.listen.mock.invocationCallOrder[0]!);
      expect(mocks.agentToolsMcpHost.listen.mock.invocationCallOrder[0])
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
      { migrationId: ATTACHMENT_MIGRATION_ID, status: "SUCCEEDED" },
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

  it("marks every capability pending before the runner runs and applies its answer before admission is rebuilt", async () => {
    await startConfiguredServer({ host: "127.0.0.1", port: 0 });

    expect(mocks.configureTokenUsageCapability.mock.calls).toEqual([
      [{ kind: "HISTORY_MIGRATION_PENDING" }],
      [{ kind: "READY" }],
    ]);
    const [pending, ready] = mocks.configureTokenUsageCapability.mock.invocationCallOrder;
    expect(mocks.assertTokenUsageCurrentSchema.mock.invocationCallOrder[0]).toBeLessThan(pending!);
    expect(pending).toBeLessThan(mocks.runPending.mock.invocationCallOrder[0]!);
    expect(mocks.runPending.mock.invocationCallOrder[0]).toBeLessThan(mocks.capabilityReadiness.mock.invocationCallOrder[0]!);
    expect(ready).toBeLessThan(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0]!);
    await expect(new CustomLlmProviderStore("/tmp/server-runtime-gate/no-such-data").listProviders()).resolves.toEqual([]);
  });

  it.each([
    ["missing", []],
    ["running", [{ migrationId: READABLE_MIGRATION_ID, status: "RUNNING", logPath: "/tmp/running.log" }]],
    ["failed", [{ migrationId: READABLE_MIGRATION_ID, status: "FAILED", logPath: "/tmp/failed.log" }]],
  ] as const)(
    "starts with only custom providers held back while the readable identity migration is %s (AC-004)",
    async (_label, statuses) => {
      mocks.runPending.mockResolvedValueOnce([{ migrationId: ATTACHMENT_MIGRATION_ID, status: "SUCCEEDED" }, ...statuses]);
      mocks.capabilityReadiness.mockResolvedValueOnce({ token_usage_history: true, custom_llm_providers: false });

      await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 }))
        .resolves.toBeUndefined();

      expect(mocks.buildStudioServer).toHaveBeenCalledTimes(1);
      expect(mocks.app.listen).toHaveBeenCalledTimes(1);
      expect(mocks.closeSecretVault).not.toHaveBeenCalled();
      expect(mocks.configureTokenUsageCapability).toHaveBeenLastCalledWith({ kind: "READY" });
      await expect(new CustomLlmProviderStore("/tmp/server-runtime-gate/no-such-data").listProviders())
        .rejects.toMatchObject({ code: "CUSTOM_PROVIDERS_MIGRATION_PENDING" });
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
  it.each(["MISSING", "NOT_RUN", "RUNNING", "FAILED", "SUCCEEDED_WITH_WARNINGS", "SUCCEEDED"])("uses independent package admission for attachment status %s", async (status) => {
    mocks.runPending.mockResolvedValueOnce([terminalReadableStatus("SUCCEEDED"), ...(status === "MISSING" ? [] : [{ migrationId: ATTACHMENT_MIGRATION_ID, status }])]);
    await startConfiguredServer({ host: "127.0.0.1", port: 0 });
    expect(mocks.rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
    expect(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0]).toBeLessThan(mocks.buildStudioServer.mock.invocationCallOrder[0]!);
    expect(mocks.app.listen).toHaveBeenCalledTimes(1);
  });
});
