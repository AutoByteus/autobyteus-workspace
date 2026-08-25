import type { FastifyInstance } from "fastify";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrlFromListenAddress,
} from "./config/server-runtime-endpoints.js";
import { appConfigProvider } from "./config/app-config-provider.js";
import { getLoggingConfigFromEnv, type LoggingConfig } from "./config/logging-config.js";
import {
  initializeRuntimeLoggerBootstrap,
} from "./logging/runtime-logger-bootstrap.js";
import { createServerLogger, initializeServerAppLogger } from "./logging/server-app-logger.js";
import { runMigrations } from "./startup/migrations.js";
import { getAppDataMigrationRunner } from "./app-data-migrations/app-data-migration-runner.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "./app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js";
import { CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID } from "./app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.js";
import { scheduleStudioBackgroundTasks } from "./startup/background-runner.js";
import {
  startChannelRunOutputDeliveryRuntime,
} from "./external-channel/runtime/channel-run-output-runtime-singleton.js";
import {
  startGatewayCallbackDeliveryRuntime,
} from "./external-channel/runtime/gateway-callback-delivery-runtime.js";
import { getManagedMessagingGatewayService } from "./managed-capabilities/messaging-gateway/defaults.js";
import type { ServerOptions } from "./app.js";
import { getSecretVaultRuntime } from "./secret-management/secret-vault-runtime.js";
import { configureFileToolDeniedPaths } from "autobyteus-ts/tools/file/workspace-path-utils.js";
import { TeamRunPackageCatalog } from "./run-history/services/team-run-package-catalog.js";
import { exitWithEmbeddedServerPlatformFatal } from "./startup/embedded-server-platform-fatal.js";
import { assertTokenUsageCurrentSchema } from "./startup/token-usage-current-schema-readiness.js";
import { TokenUsageAnalyticsProjectionWriter } from "./token-usage/services/token-usage-analytics-projection-writer.js";
import {
  TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID,
  configureTokenUsageMigrationReadiness,
} from "./token-usage/providers/token-usage-migration-readiness.js";
import { buildStudioServer } from "./compositions/build-studio-server.js";

const logger = createServerLogger("server.runtime");

const registerShutdownHandlers = (app: FastifyInstance): void => {
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}. Shutting down server...`);
    try {
      await app.close();
      logger.info("Server closed cleanly.");
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${String(error)}`);
      process.exit(1);
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
};

const fatal = (input: {
  code: Parameters<typeof exitWithEmbeddedServerPlatformFatal>[0]["code"];
  summary: string;
  logPath: string | null;
}): never => {
  logger.error(input.summary);
  return exitWithEmbeddedServerPlatformFatal(input);
};

export async function startConfiguredServer(options: ServerOptions): Promise<void> {
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

  const fatalAfterPrerequisiteUnwind = async (input: {
    code: Parameters<typeof fatal>[0]["code"];
    summary: string;
  }): Promise<never> => {
    let summary = input.summary;
    try {
      await unwindProcessPrerequisites();
    } catch (cleanupError) {
      summary = `${summary}; prerequisite cleanup failed: ${String(cleanupError)}`;
    }
    return fatal({ code: input.code, summary, logPath: serverLogPath });
  };

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
  configureFileToolDeniedPaths([
    databaseLocation.databasePath,
    databaseLocation.rootKeyPath,
    `${databaseLocation.databasePath}-wal`,
    `${databaseLocation.databasePath}-shm`,
    `${databaseLocation.databasePath}-journal`,
  ]);
  prismaInitializationStarted = true;
  try {
    await initializePrisma({ datasourceUrl: databaseLocation.databaseUrl });
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "APPLICATION_DATABASE_INITIALIZATION_FAILED",
      summary: `Failed to initialize application database: ${String(error)}`,
    });
  }

  try {
    await assertTokenUsageCurrentSchema();
    await new TokenUsageAnalyticsProjectionWriter().initializeCoverage();
    configureTokenUsageMigrationReadiness({
      kind: "CURRENT_SCHEMA_DEGRADED",
      migrationStatus: "NOT_RUN",
      logPath: null,
    });
  } catch (error) {
    const summary = `Required current token-usage schema is unavailable: ${String(error)}`;
    configureTokenUsageMigrationReadiness({
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
    await getSecretVaultRuntime().initialize(databaseLocation);
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "SECRET_VAULT_INITIALIZATION_FAILED",
      summary: `Failed to initialize secret vault: ${String(error)}`,
    });
  }

  try {
    const statuses = await getAppDataMigrationRunner().runPending();
    for (const migration of statuses) {
      if (migration.status === "FAILED" || migration.status === "RUNNING") {
        logger.warn(
          `Studio app-data migration '${migration.migrationId}' is ${migration.status}: `
          + `${migration.errorMessage ?? "no detail"}`,
        );
      }
    }
    const tokenUsageStatus = statuses.find(
      (status) => status.migrationId === TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID,
    );
    configureTokenUsageMigrationReadiness(
      tokenUsageStatus?.status === "SUCCEEDED"
        || tokenUsageStatus?.status === "SUCCEEDED_WITH_WARNINGS"
        ? { kind: "READY" }
        : {
            kind: "CURRENT_SCHEMA_DEGRADED",
            migrationStatus: tokenUsageStatus?.status ?? "MISSING",
            logPath: tokenUsageStatus?.logPath ?? null,
          },
    );
    await new TeamRunPackageCatalog(config.getMemoryDir()).rebuild();
    const teamRunV2Status = statuses.find(
      (status) => status.migrationId === TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID,
    );
    if (teamRunV2Status?.status !== "SUCCEEDED") {
      logger.warn(
        `TeamRun execution-tree V2 migration did not report clean success; startup continues with strict current-package admission: ${JSON.stringify({
          migrationId: TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID,
          displayName: teamRunV2Status?.displayName ?? null,
          status: teamRunV2Status?.status ?? "MISSING",
          attempts: teamRunV2Status?.attempts ?? null,
          errorMessage: teamRunV2Status?.errorMessage ?? null,
          logPath: teamRunV2Status?.logPath ?? null,
        })}`,
      );
    }
    const readableProviderStatus = statuses.find(
      (status) => status.migrationId === CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID,
    );
    if (
      readableProviderStatus?.status !== "SUCCEEDED"
      && readableProviderStatus?.status !== "SUCCEEDED_WITH_WARNINGS"
    ) {
      throw new Error([
        "CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED",
        readableProviderStatus?.status ?? "NOT_RUN",
        readableProviderStatus?.logPath ?? "NO_LOG",
      ].join(":"));
    }
  } catch (error) {
    await fatalAfterPrerequisiteUnwind({
      code: "APP_DATA_STARTUP_GATE_FAILED",
      summary: `Failed to run app data migrations: ${String(error)}`,
    });
  }

  let app!: FastifyInstance;
  let applicationRuntime!: Awaited<ReturnType<typeof buildStudioServer>>["applicationRuntime"];
  try {
    const studioServer = await buildStudioServer({ appConfig: config, loggingConfig });
    app = studioServer.fastify;
    applicationRuntime = studioServer.applicationRuntime;
    prismaInitializationStarted = false;
    vaultInitializationStarted = false;
    registerShutdownHandlers(app);
    await applicationRuntime.lifecycle.prepareBeforeListen();
    await app.listen({ host: options.host, port: options.port });
    logger.info(`Server listening on ${options.host}:${options.port}`);
    startChannelRunOutputDeliveryRuntime();
    startGatewayCallbackDeliveryRuntime();
  } catch (error) {
    if (app) await app.close().catch((closeError) => {
      logger.error(`Failed to close Studio server after startup error: ${String(closeError)}`);
    });
    fatal({
      code: "HTTP_SERVER_INITIALIZATION_FAILED",
      summary: `Failed to initialize HTTP server: ${String(error)}`,
      logPath: serverLogPath,
    });
  }

  try {
    const internalBaseUrl = seedInternalServerBaseUrlFromListenAddress({
      requestedHost: options.host,
      listenAddress: app.server.address(),
    });
    logger.info(`Server internal base URL configured to: ${internalBaseUrl}`);
  } catch (error) {
    delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    logger.error(`Failed to derive internal server base URL for managed messaging: ${String(error)}`);
  }

  try {
    await getManagedMessagingGatewayService().restoreIfEnabled();
  } catch (error) {
    logger.error(`Failed to restore managed messaging gateway: ${String(error)}`);
  }

  try {
    await applicationRuntime.lifecycle.recoverAfterListen();
  } catch (error) {
    await app.close().catch((closeError) => {
      logger.error(`Failed to close Studio server after recovery error: ${String(closeError)}`);
    });
    fatal({
      code: "APPLICATION_ORCHESTRATION_RECOVERY_FAILED",
      summary: `Failed to complete application orchestration startup recovery: ${String(error)}`,
      logPath: serverLogPath,
    });
  }

  await scheduleStudioBackgroundTasks();
}
