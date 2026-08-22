import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_MIGRATION_ID = "token-usage-v1";
const TEAM_MIGRATION_ID = "team-run-v1";
const READABLE_MIGRATION_ID = "readable-provider-v1";

const mocks = vi.hoisted(() => {
  const applicationLifecycle = {
    prepareBeforeListen: vi.fn(async () => undefined),
    recoverAfterListen: vi.fn(async () => undefined),
  };
  const app = {
    listen: vi.fn(async () => "http://127.0.0.1:43210"),
    close: vi.fn(async () => undefined),
    server: {
      address: vi.fn(() => ({ address: "127.0.0.1", family: "IPv4", port: 43210 })),
    },
  };
  const appConfig = {
    initialize: vi.fn(),
    getLogsDir: () => "/tmp/standalone-lifecycle/logs",
    getMemoryDir: () => "/tmp/standalone-lifecycle/memory",
    getAppRootDir: () => "/tmp/standalone-lifecycle",
    getOperationalDatabaseUrl: () => "file:/tmp/standalone-lifecycle/operational.db",
    getOperationalDatabaseLocation: () => ({
      databasePath: "/tmp/standalone-lifecycle/operational.db",
      rootKeyPath: "/tmp/standalone-lifecycle/root.key",
      databaseUrl: "file:/tmp/standalone-lifecycle/operational.db",
    }),
  };
  const mcpRuntime = {
    generalProcessSessionManager: {},
    routeDependencies: {},
    close: vi.fn(),
  };
  const generalProcessRunSupervisor = { close: vi.fn(async () => undefined) };
  return {
    app,
    appConfig,
    applicationLifecycle,
    mcpRuntime,
    generalProcessRunSupervisor,
    materializeConfig: vi.fn(async () => undefined),
    validatePackage: vi.fn(async () => ({
      selection: { applicationId: "local-package::brief-studio" },
      bundleService: {},
    })),
    initializePrisma: vi.fn(async () => undefined),
    shutdownPrisma: vi.fn(async () => undefined),
    runDatabaseMigrations: vi.fn(),
    assertTokenUsageCurrentSchema: vi.fn(async () => undefined),
    configureTokenUsageMigrationReadiness: vi.fn(),
    initializeSecretVault: vi.fn(async () => undefined),
    closeSecretVault: vi.fn(async () => undefined),
    runPending: vi.fn(),
    rebuildTeamRunCatalog: vi.fn(async () => undefined),
    resetEventPipeline: vi.fn(async () => undefined),
    stopEventPipeline: vi.fn(async () => undefined),
    createDefinitionServices: vi.fn(() => ({})),
    createMcpRuntime: vi.fn(() => mcpRuntime),
    createGeneralProcessRunSupervisor: vi.fn(() => generalProcessRunSupervisor),
    buildApplicationPlatformRuntime: vi.fn(() => ({ lifecycle: applicationLifecycle })),
    buildStandaloneApplicationServer: vi.fn(async () => app),
    configureDeniedPaths: vi.fn(),
    seedInternalBaseUrl: vi.fn(),
    loggerWarn: vi.fn(),
  };
});

vi.mock("repository_prisma", async (importOriginal) => ({
  ...await importOriginal<typeof import("repository_prisma")>(),
  initializePrisma: mocks.initializePrisma,
  shutdownPrisma: mocks.shutdownPrisma,
}));
vi.mock("../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    initialize: vi.fn(() => mocks.appConfig),
  },
}));
vi.mock("../../../src/config/logging-config.js", () => ({
  getLoggingConfigFromEnv: vi.fn(() => ({
    level: "silent",
    httpAccessLogMode: "off",
    includeNoisyHttpAccessRoutes: false,
  })),
}));
vi.mock("../../../src/logging/runtime-logger-bootstrap.js", () => ({
  initializeRuntimeLoggerBootstrap: vi.fn(() => ({ logFilePath: "/tmp/standalone.log" })),
}));
vi.mock("../../../src/logging/server-app-logger.js", () => ({
  createServerLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: mocks.loggerWarn,
    debug: vi.fn(),
  }),
  initializeServerAppLogger: vi.fn(),
}));
vi.mock("../../../src/startup/migrations.js", () => ({
  runMigrations: mocks.runDatabaseMigrations,
}));
vi.mock("../../../src/startup/token-usage-current-schema-readiness.js", () => ({
  assertTokenUsageCurrentSchema: mocks.assertTokenUsageCurrentSchema,
}));
vi.mock("../../../src/token-usage/providers/token-usage-migration-readiness.js", () => ({
  TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID: "token-usage-v1",
  configureTokenUsageMigrationReadiness: mocks.configureTokenUsageMigrationReadiness,
}));
vi.mock("../../../src/secret-management/secret-vault-runtime.js", () => ({
  getSecretVaultRuntime: () => ({
    initialize: mocks.initializeSecretVault,
    close: mocks.closeSecretVault,
  }),
}));
vi.mock("../../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => ({ runPending: mocks.runPending }),
}));
vi.mock("../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js", () => ({
  TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID: "team-run-v1",
}));
vi.mock("../../../src/app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.js", () => ({
  CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID: "readable-provider-v1",
}));
vi.mock("../../../src/run-history/services/team-run-v1-package-catalog.js", () => ({
  TeamRunV1PackageCatalog: class {
    rebuild = mocks.rebuildTeamRunCatalog;
  },
}));
vi.mock("../../../src/agent-execution/events/default-agent-run-event-pipeline.js", () => ({
  resetDefaultAgentRunEventPipeline: mocks.resetEventPipeline,
  stopDefaultAgentRunEventPipeline: mocks.stopEventPipeline,
}));
vi.mock("../../../src/standalone-application-host/config/standalone-host-config-materializer.js", () => ({
  materializeStandaloneHostConfig: mocks.materializeConfig,
}));
vi.mock("../../../src/application-platform/launch-configuration/application-standalone-package-validator.js", () => ({
  validateStandaloneApplicationPackage: mocks.validatePackage,
}));
vi.mock("../../../src/application-platform/runtime/create-application-definition-services.js", () => ({
  createApplicationDefinitionServices: mocks.createDefinitionServices,
}));
vi.mock("../../../src/agent-tools/mcp/agent-tools-mcp-runtime.js", () => ({
  createAgentToolsMcpRuntime: mocks.createMcpRuntime,
}));
vi.mock("../../../src/services/published-artifacts/published-artifact-publication-service.js", () => ({
  getGeneralProcessPublishedArtifactPublisher: vi.fn(() => ({})),
}));
vi.mock("../../../src/agent-execution/runtime/general-process-run-supervisor.js", () => ({
  createGeneralProcessRunSupervisor: mocks.createGeneralProcessRunSupervisor,
}));
vi.mock("../../../src/application-platform/runtime/build-application-platform-runtime.js", () => ({
  buildApplicationPlatformRuntime: mocks.buildApplicationPlatformRuntime,
}));
vi.mock("../../../src/compositions/build-standalone-application-server.js", () => ({
  buildStandaloneApplicationServer: mocks.buildStandaloneApplicationServer,
}));
vi.mock("autobyteus-ts/tools/file/workspace-path-utils.js", () => ({
  configureFileToolDeniedPaths: mocks.configureDeniedPaths,
}));
vi.mock("../../../src/config/server-runtime-endpoints.js", () => ({
  seedInternalServerBaseUrlFromListenAddress: mocks.seedInternalBaseUrl,
}));

import { startStandaloneApplicationHost } from "../../../src/standalone-application-host/start-standalone-application-host.js";

const status = (
  migrationId: string,
  migrationStatus: "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS" | "FAILED" | "RUNNING",
  extra: Record<string, unknown> = {},
) => ({ migrationId, status: migrationStatus, ...extra });

const successfulStatuses = () => [
  status(TOKEN_MIGRATION_ID, "SUCCEEDED"),
  status(TEAM_MIGRATION_ID, "SUCCEEDED"),
  status(READABLE_MIGRATION_ID, "SUCCEEDED_WITH_WARNINGS"),
];

const input = {
  packageRoot: "/tmp/standalone-package",
  localApplicationId: "brief-studio",
  appDataDir: "/tmp/standalone-data",
  host: "127.0.0.1",
  port: 0,
};

describe("standalone application host latest-Personal prerequisite lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runPending.mockResolvedValue(successfulStatuses());
  });

  it("runs phases 5-10 in order before event-pipeline and application construction", async () => {
    const handle = await startStandaloneApplicationHost(input);

    expect(mocks.assertTokenUsageCurrentSchema).toHaveBeenCalledTimes(1);
    expect(mocks.configureTokenUsageMigrationReadiness).toHaveBeenNthCalledWith(1, {
      kind: "CURRENT_SCHEMA_DEGRADED",
      migrationStatus: "NOT_RUN",
      logPath: null,
    });
    expect(mocks.configureTokenUsageMigrationReadiness).toHaveBeenNthCalledWith(2, {
      kind: "READY",
    });
    expect(mocks.runPending).toHaveBeenCalledTimes(1);
    expect(mocks.rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
    expect(mocks.assertTokenUsageCurrentSchema.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.initializeSecretVault.mock.invocationCallOrder[0]!);
    expect(mocks.initializeSecretVault.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.runPending.mock.invocationCallOrder[0]!);
    expect(mocks.runPending.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0]!);
    expect(mocks.rebuildTeamRunCatalog.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.resetEventPipeline.mock.invocationCallOrder[0]!);
    expect(mocks.resetEventPipeline.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.buildApplicationPlatformRuntime.mock.invocationCallOrder[0]!);
    expect(mocks.applicationLifecycle.prepareBeforeListen.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.app.listen.mock.invocationCallOrder[0]!);
    expect(mocks.applicationLifecycle.recoverAfterListen).toHaveBeenCalledTimes(1);

    await handle.close();
    expect(mocks.closeSecretVault).toHaveBeenCalledTimes(1);
    expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
  });

  it("marks current-schema failure critical and unwinds Prisma before later phases", async () => {
    mocks.assertTokenUsageCurrentSchema.mockRejectedValueOnce(new Error("missing current table"));

    await expect(startStandaloneApplicationHost(input))
      .rejects.toThrow("Required current token-usage schema is unavailable");

    expect(mocks.configureTokenUsageMigrationReadiness).toHaveBeenCalledWith(expect.objectContaining({
      kind: "CRITICAL_CURRENT_SCHEMA_FAILURE",
      reason: expect.stringContaining("missing current table"),
    }));
    expect(mocks.initializeSecretVault).not.toHaveBeenCalled();
    expect(mocks.runPending).not.toHaveBeenCalled();
    expect(mocks.rebuildTeamRunCatalog).not.toHaveBeenCalled();
    expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
  });

  it("treats vault initialization failure as fatal and unwinds the started vault and Prisma owners", async () => {
    mocks.initializeSecretVault.mockRejectedValueOnce(new Error("vault unavailable"));

    await expect(startStandaloneApplicationHost(input)).rejects.toThrow("vault unavailable");

    expect(mocks.runPending).not.toHaveBeenCalled();
    expect(mocks.rebuildTeamRunCatalog).not.toHaveBeenCalled();
    expect(mocks.closeSecretVault).toHaveBeenCalledTimes(1);
    expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
  });

  it("treats migration runner failure as fatal before catalog rebuild and unwinds repository owners", async () => {
    mocks.runPending.mockRejectedValueOnce(new Error("migration state unavailable"));

    await expect(startStandaloneApplicationHost(input)).rejects.toThrow("migration state unavailable");

    expect(mocks.rebuildTeamRunCatalog).not.toHaveBeenCalled();
    expect(mocks.resetEventPipeline).not.toHaveBeenCalled();
    expect(mocks.closeSecretVault).toHaveBeenCalledTimes(1);
    expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
  });

  it("retains degraded token history and strict TeamRun admission without blocking a current-schema run", async () => {
    mocks.runPending.mockResolvedValueOnce([
      status(TOKEN_MIGRATION_ID, "FAILED", { logPath: "/tmp/token.log", errorMessage: "history failed" }),
      status(TEAM_MIGRATION_ID, "FAILED", { logPath: "/tmp/team.log", errorMessage: "legacy package" }),
      status(READABLE_MIGRATION_ID, "SUCCEEDED"),
    ]);

    const handle = await startStandaloneApplicationHost(input);

    expect(mocks.configureTokenUsageMigrationReadiness).toHaveBeenLastCalledWith({
      kind: "CURRENT_SCHEMA_DEGRADED",
      migrationStatus: "FAILED",
      logPath: "/tmp/token.log",
    });
    expect(mocks.rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(expect.stringContaining(
      "startup continues with strict current-package admission",
    ));
    expect(mocks.app.listen).toHaveBeenCalledTimes(1);

    await handle.close();
  });

  it.each([
    ["missing", [], "NOT_RUN", "NO_LOG"],
    ["running", [status(READABLE_MIGRATION_ID, "RUNNING", { logPath: "/tmp/readable-running.log" })], "RUNNING", "/tmp/readable-running.log"],
    ["failed", [status(READABLE_MIGRATION_ID, "FAILED", { logPath: "/tmp/readable-failed.log" })], "FAILED", "/tmp/readable-failed.log"],
  ] as const)(
    "rejects %s readable-provider readiness after catalog rebuild and unwinds repository resources",
    async (_label, statuses, expectedStatus, expectedLogPath) => {
      mocks.runPending.mockResolvedValueOnce(statuses);

      await expect(startStandaloneApplicationHost(input)).rejects.toThrow(
        `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:${expectedStatus}:${expectedLogPath}`,
      );

      expect(mocks.rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
      expect(mocks.resetEventPipeline).not.toHaveBeenCalled();
      expect(mocks.buildApplicationPlatformRuntime).not.toHaveBeenCalled();
      expect(mocks.closeSecretVault).toHaveBeenCalledTimes(1);
      expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
    },
  );

  it("treats catalog rebuild failure as fatal and still unwinds repository resources", async () => {
    mocks.rebuildTeamRunCatalog.mockRejectedValueOnce(new Error("catalog unavailable"));

    await expect(startStandaloneApplicationHost(input)).rejects.toThrow("catalog unavailable");

    expect(mocks.resetEventPipeline).not.toHaveBeenCalled();
    expect(mocks.buildApplicationPlatformRuntime).not.toHaveBeenCalled();
    expect(mocks.closeSecretVault).toHaveBeenCalledTimes(1);
    expect(mocks.shutdownPrisma).toHaveBeenCalledTimes(1);
  });
});
