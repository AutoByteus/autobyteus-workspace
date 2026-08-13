import type { FastifyInstance } from "fastify";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { configureFileToolDeniedPaths } from "autobyteus-ts/tools/file/workspace-path-utils.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrlFromListenAddress,
} from "./config/server-runtime-endpoints.js";
import { appConfigProvider } from "./config/app-config-provider.js";
import { getLoggingConfigFromEnv } from "./config/logging-config.js";
import {
  initializeRuntimeLoggerBootstrap,
} from "./logging/runtime-logger-bootstrap.js";
import { createServerLogger, initializeServerAppLogger } from "./logging/server-app-logger.js";
import { runMigrations } from "./startup/migrations.js";
import { getAppDataMigrationRunner } from "./app-data-migrations/app-data-migration-runner.js";
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

const initializeStudioProcessResources = async (): Promise<{
  loggingConfig: ReturnType<typeof getLoggingConfigFromEnv>;
}> => {
  let prismaInitializationStarted = false;
  let vaultInitializationStarted = false;
  try {
    const config = appConfigProvider.config;
    const loggingConfig = getLoggingConfigFromEnv(process.env);
    initializeRuntimeLoggerBootstrap({
      logsDir: config.getLogsDir(),
      loggingConfig,
    });
    initializeServerAppLogger(loggingConfig);
    runMigrations({
      appRoot: config.getAppRootDir(),
      databaseUrl: config.getOperationalDatabaseUrl(),
    });
    const databaseLocation = config.getOperationalDatabaseLocation();
    configureFileToolDeniedPaths([
      databaseLocation.databasePath,
      databaseLocation.rootKeyPath,
      `${databaseLocation.databasePath}-wal`,
      `${databaseLocation.databasePath}-shm`,
      `${databaseLocation.databasePath}-journal`,
    ]);
    prismaInitializationStarted = true;
    await initializePrisma({ datasourceUrl: databaseLocation.databaseUrl });
    vaultInitializationStarted = true;
    await getSecretVaultRuntime().initialize(databaseLocation);
    const migrations = await getAppDataMigrationRunner().runPending();
    for (const migration of migrations) {
      if (migration.status === "FAILED" || migration.status === "RUNNING") {
        logger.warn(
          `Studio app-data migration '${migration.migrationId}' is ${migration.status}: `
          + `${migration.errorMessage ?? "no detail"}`,
        );
      }
    }
    const readableIdentityMigration = migrations.find(
      ({ migrationId }) =>
        migrationId === CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID,
    );
    if (
      readableIdentityMigration?.status !== "SUCCEEDED"
      && readableIdentityMigration?.status !== "SUCCEEDED_WITH_WARNINGS"
    ) {
      throw new Error([
        "CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED",
        readableIdentityMigration?.status ?? "NOT_RUN",
        readableIdentityMigration?.logPath ?? "NO_LOG",
      ].join(":"));
    }
    return { loggingConfig };
  } catch (error) {
    if (vaultInitializationStarted) {
      try {
        await getSecretVaultRuntime().close();
      } finally {
        if (prismaInitializationStarted) {
          await shutdownPrisma();
        }
      }
    } else if (prismaInitializationStarted) {
      await shutdownPrisma();
    }
    throw error;
  }
};

export async function startConfiguredServer(options: ServerOptions): Promise<void> {
  let app: FastifyInstance | null = null;
  let processResourcesInitialized = false;
  try {
    const { loggingConfig } = await initializeStudioProcessResources();
    processResourcesInitialized = true;
    const studioServer = await buildStudioServer({
      appConfig: appConfigProvider.config,
      loggingConfig,
    });
    app = studioServer.fastify;
    registerShutdownHandlers(app);
    await studioServer.applicationRuntime.lifecycle.prepareBeforeListen();
    await app.listen({ host: options.host, port: options.port });
    logger.info(`Server listening on ${options.host}:${options.port}`);
    startChannelRunOutputDeliveryRuntime();
    startGatewayCallbackDeliveryRuntime();
    try {
      const internalBaseUrl = seedInternalServerBaseUrlFromListenAddress({
        requestedHost: options.host,
        listenAddress: app.server.address(),
      });
      logger.info(`Server internal base URL configured to: ${internalBaseUrl}`);
    } catch (error) {
      delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      logger.error(
        `Failed to derive internal server base URL for managed messaging: ${String(error)}`,
      );
    }
    try {
      await getManagedMessagingGatewayService().restoreIfEnabled();
    } catch (error) {
      logger.error(`Failed to restore managed messaging gateway: ${String(error)}`);
    }
    await studioServer.applicationRuntime.lifecycle.recoverAfterListen();
    await scheduleStudioBackgroundTasks();
  } catch (error) {
    if (app) {
      await app.close().catch((closeError) => {
        logger.error(`Failed to close Studio server after startup error: ${String(closeError)}`);
      });
    } else if (processResourcesInitialized) {
      try {
        await getSecretVaultRuntime().close();
      } finally {
        await shutdownPrisma();
      }
    }
    throw error;
  }
}
