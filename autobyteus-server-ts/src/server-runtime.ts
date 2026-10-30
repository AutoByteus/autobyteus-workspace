import { ServerProcessShutdown, StartupCancelled } from "./shutdown/server-process-shutdown.js";
import type { FastifyInstance } from "fastify";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { appConfigProvider } from "./config/app-config-provider.js";
import { getLoggingConfigFromEnv, type LoggingConfig } from "./config/logging-config.js";
import {
  initializeRuntimeLoggerBootstrap,
} from "./logging/runtime-logger-bootstrap.js";
import { createServerLogger, initializeServerAppLogger } from "./logging/server-app-logger.js";
import { runMigrations } from "./startup/migrations.js";
import { getAppDataMigrationRunner } from "./app-data-migrations/app-data-migration-runner.js";
import { scheduleStudioBackgroundTasks } from "./startup/background-runner.js";
import type { ServerOptions } from "./app.js";
import { disableEnvironmentProviderApiKeySource } from "autobyteus-ts/secrets/provider-api-key-resolver.js";
import { getSecretVaultRuntime } from "./secret-management/secret-vault-runtime.js";
import { installRuntimeMcpSecretResolver } from "./secret-management/resolution/mcp-secret-resolver.js";
import {
  selectedTestVaultPaths,
  selectSecretVaultSource,
} from "./secret-management/secret-vault-source.js";
import { TEST_VAULT_SETTING_NAME } from "autobyteus-ts/secrets/test-vault-setting.js";
import { configureFileToolDeniedPaths } from "autobyteus-ts/tools/file/workspace-path-utils.js";
import { RootRunPackageReadinessIndex } from "./run-history/services/root-run-package-readiness-index.js";
import { exitWithEmbeddedServerPlatformFatal } from "./startup/embedded-server-platform-fatal.js";
import { assertTokenUsageCurrentSchema } from "./startup/token-usage-current-schema-readiness.js";
import { TokenUsageAnalyticsProjectionWriter } from "./token-usage/services/token-usage-analytics-projection-writer.js";
import { configureTokenUsageCapability } from "./token-usage/providers/token-usage-capability.js";
import { applyCapabilityReadiness, markCapabilitiesPending } from "./startup/app-data-capability-readiness.js";
import { buildStudioServer } from "./compositions/build-studio-server.js";

const logger = createServerLogger("server.runtime");

const fatal = (input: {
  code: Parameters<typeof exitWithEmbeddedServerPlatformFatal>[0]["code"];
  summary: string;
  logPath: string | null;
}): never => {
  logger.error(input.summary);
  return exitWithEmbeddedServerPlatformFatal(input);
};

export async function startConfiguredServer(options: ServerOptions): Promise<void> {
  const shutdown = new ServerProcessShutdown();
  try { await initializeConfiguredServer(options, shutdown); }
  finally { shutdown.settleStartup(); }
}

async function initializeConfiguredServer(options: ServerOptions, shutdown: ServerProcessShutdown): Promise<void> {
  // The server owns its vault: autobyteus-ts must never read AUTOBYTEUS_TEST_VAULT itself here.
  disableEnvironmentProviderApiKeySource();
  let loggingConfig: LoggingConfig = getLoggingConfigFromEnv(process.env);
  let serverLogPath: string | null = null;
  let prismaInitializationStarted = false;
  let vaultInitializationStarted = false;

  const unwindProcessPrerequisites = async (): Promise<void> => {
    const errors: unknown[] = [];
    if (vaultInitializationStarted) {
      try {
        await getSecretVaultRuntime().close();
      } catch (error) {
        errors.push(error);
      }
      vaultInitializationStarted = false;
    }
    if (prismaInitializationStarted) {
      try {
        await shutdownPrisma();
      } catch (error) {
        errors.push(error);
      }
      prismaInitializationStarted = false;
    }
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        "Studio process prerequisite cleanup failed.",
      );
    }
  };

  shutdown.setCleanup(unwindProcessPrerequisites);
  class StartupFailure extends Error {
    constructor(readonly input: { code: Parameters<typeof fatal>[0]["code"]; summary: string }) { super(input.summary); }
  }
  const fatalAfterPrerequisiteUnwind = async (input: {
    code: Parameters<typeof fatal>[0]["code"]; summary: string;
  }): Promise<never> => { shutdown.checkpoint(); throw new StartupFailure(input); };

  try {

  try {
    loggingConfig = getLoggingConfigFromEnv(process.env);
    serverLogPath = initializeRuntimeLoggerBootstrap({
      logsDir: appConfigProvider.config.getLogsDir(),
      loggingConfig,
    }).logFilePath;
    initializeServerAppLogger(loggingConfig);
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "RUNTIME_LOGGING_INITIALIZATION_FAILED",
      summary: `Failed to initialize runtime logging: ${String(error)}`,
    });
  }

  const config = appConfigProvider.config;
  try {
    runMigrations({
      appRoot: config.getAppRootDir(),
      databaseUrl: config.getOperationalDatabaseUrl(),
    });
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "DATABASE_MIGRATION_FAILED",
      summary: `Failed to run database migrations: ${String(error)}`,
    });
  }

  const databaseLocation = config.getOperationalDatabaseLocation();
  const vaultSource = selectSecretVaultSource({
    testVaultSetting: config.get(TEST_VAULT_SETTING_NAME),
    appDataDir: config.getAppDataDir(),
    databaseLocation,
  });
  configureFileToolDeniedPaths([
    databaseLocation.databasePath,
    databaseLocation.rootKeyPath,
    `${databaseLocation.databasePath}-wal`,
    `${databaseLocation.databasePath}-shm`,
    `${databaseLocation.databasePath}-journal`,
    ...selectedTestVaultPaths(vaultSource),
  ]);
  prismaInitializationStarted = true;
  try {
    await shutdown.stage(() => initializePrisma({ datasourceUrl: databaseLocation.databaseUrl }));
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "APPLICATION_DATABASE_INITIALIZATION_FAILED",
      summary: `Failed to initialize application database: ${String(error)}`,
    });
  }

  try {
    await shutdown.stage(() => assertTokenUsageCurrentSchema());
    await shutdown.stage(() => new TokenUsageAnalyticsProjectionWriter().initializeCoverage());
    markCapabilitiesPending();
  } catch (error) {
    const summary = `Required current token-usage schema is unavailable: ${String(error)}`;
    configureTokenUsageCapability({
      kind: "CRITICAL_CURRENT_SCHEMA_FAILURE",
      reason: summary,
    });
    await fatalAfterPrerequisiteUnwind({
      code: "TOKEN_USAGE_CURRENT_SCHEMA_INVALID",
      summary,
    });
  }

  vaultInitializationStarted = true;
  try {
    await shutdown.stage(() => getSecretVaultRuntime().initialize(vaultSource));
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "SECRET_VAULT_INITIALIZATION_FAILED",
      summary: `Failed to initialize secret vault: ${String(error)}`,
    });
  }
  // Every managed MCP server resolves its secret references through the vault runtime, from here on.
  installRuntimeMcpSecretResolver();

  try {
    const runner = getAppDataMigrationRunner();
    const statuses = await shutdown.stage(() => runner.runPending());
    for (const migration of statuses) {
      if (migration.status === "FAILED" || migration.status === "RUNNING") {
        logger.warn(
          `Studio app-data migration '${migration.migrationId}' is ${migration.status}: `
          + `${migration.errorMessage ?? "no detail"}`,
        );
      }
    }
    applyCapabilityReadiness(await shutdown.stage(() => runner.capabilityReadiness()));
    await shutdown.stage(() => new RootRunPackageReadinessIndex(config.getMemoryDir()).rebuild());
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "APP_DATA_STARTUP_GATE_FAILED",
      summary: `Failed to run app data migrations: ${String(error)}`,
    });
  }

  let app!: FastifyInstance;
  let applicationRuntime!: Awaited<ReturnType<typeof buildStudioServer>>["applicationRuntime"];
  try {
    shutdown.checkpoint();
    const studioServer = await buildStudioServer({ appConfig: config, loggingConfig,
      onCleanupOwnershipTransferred: close => {
        shutdown.setCleanup(close);
        prismaInitializationStarted = false;
        vaultInitializationStarted = false;
      },
    });
    app = studioServer.fastify;
    applicationRuntime = studioServer.applicationRuntime;
    shutdown.setCleanup(() => app.close());
    prismaInitializationStarted = false;
    vaultInitializationStarted = false;
    shutdown.checkpoint();
    await shutdown.stage(() => applicationRuntime.lifecycle.prepareBeforeListen());
    await shutdown.stage(() => studioServer.agentToolsMcpHost.listen());
    await shutdown.stage(() => studioServer.credentialProxyHost.listen());
    await shutdown.stage(() => app.listen({ host: options.host, port: options.port }));
    logger.info(`Server listening on ${options.host}:${options.port}`);
  } catch (error) {
    shutdown.checkpoint();
    throw new StartupFailure({ code: "HTTP_SERVER_INITIALIZATION_FAILED", summary: `Failed to initialize HTTP server: ${String(error)}` });
  }
  try {
    await shutdown.stage(() => applicationRuntime.lifecycle.recoverAfterListen());
  } catch (error) {
    shutdown.checkpoint();
    throw new StartupFailure({ code: "APPLICATION_ORCHESTRATION_RECOVERY_FAILED", summary: `Failed to complete application recovery: ${String(error)}` });
  }

  await shutdown.stage(() => scheduleStudioBackgroundTasks());
  } catch (error) {
    if (error instanceof StartupCancelled || shutdown.requested) return;
    let cleanupError = '';
    try { await shutdown.cleanupOnce(); } catch (failure) { cleanupError = `; cleanup failed: ${String(failure)}`; }
    const failure = error instanceof StartupFailure ? error.input : {
      code: "HTTP_SERVER_INITIALIZATION_FAILED" as const, summary: String(error),
    };
    fatal({ ...failure, summary: failure.summary + cleanupError, logPath: serverLogPath });
  }
}
