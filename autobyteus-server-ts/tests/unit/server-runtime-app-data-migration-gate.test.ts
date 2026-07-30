import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const app = {
    listen: vi.fn(),
    close: vi.fn(),
    register: vi.fn(),
    addHook: vi.fn(),
    server: { address: vi.fn() },
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

describe("startConfiguredServer required app-data migration gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rethrows required migration failure before built-in bootstrap, app construction, or listen", async () => {
    const requiredFailure = Object.assign(
      new Error("Required app data migrations are not startable: reset:FAILED."),
      {
        name: "RequiredAppDataMigrationError",
        code: "REQUIRED_APP_DATA_MIGRATION_FAILED",
        results: [{ migrationId: "reset", status: "FAILED" }],
      },
    );
    mocks.runPending.mockRejectedValueOnce(requiredFailure);

    await expect(startConfiguredServer({ host: "127.0.0.1", port: 0 }))
      .rejects.toBe(requiredFailure);

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
    expect(mocks.bootstrapBuiltInAgents).not.toHaveBeenCalled();
    expect(mocks.fastify).not.toHaveBeenCalled();
    expect(mocks.app.listen).not.toHaveBeenCalled();
    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to run app data migrations"),
    );
  });
});
