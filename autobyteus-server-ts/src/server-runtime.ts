import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrlFromListenAddress,
} from "./config/server-runtime-endpoints.js";
import { appConfigProvider } from "./config/app-config-provider.js";
import { getLoggingConfigFromEnv, type LoggingConfig } from "./config/logging-config.js";
import { registerHttpAccessLogPolicy } from "./logging/http-access-log-policy.js";
import { createServerLogger, initializeServerAppLogger } from "./logging/server-app-logger.js";
import {
  getFastifyLoggerOptions,
  initializeRuntimeLoggerBootstrap,
} from "./logging/runtime-logger-bootstrap.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "./api/fastify-runtime-config.js";
import { runMigrations } from "./startup/migrations.js";
import { getAppDataMigrationRunner } from "./app-data-migrations/app-data-migration-runner.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";
import { CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID } from "./app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.js";
import { scheduleBackgroundTasks } from "./startup/background-runner.js";
import { bootstrapBuiltInAgents } from "./built-in-agents/built-in-agent-bootstrapper.js";
import { registerRestRoutes } from "./api/rest/index.js";
import { registerGraphql } from "./api/graphql/index.js";
import { registerWebsocketRoutes } from "./api/websocket/index.js";
import { registerAgentToolsMcpRoutes } from "./agent-tools/mcp/agent-tools-mcp-routes.js";
import { registerMcpGatewayRoutes } from "./mcp-gateway/mcp-gateway-routes.js";
import { registerRemoteAccessPolicyPlugin } from "./api/security/remote-access-policy-plugin.js";
import { registerMobileWebStaticRoutes } from "./api/static/mobile-web.js";
import { getApplicationExecutionEventDispatchService } from "./application-orchestration/services/application-execution-event-dispatch-service.js";
import { getApplicationOrchestrationRecoveryService } from "./application-orchestration/services/application-orchestration-recovery-service.js";
import { getApplicationOrchestrationStartupGate } from "./application-orchestration/services/application-orchestration-startup-gate.js";
import { getApplicationAvailabilityService } from "./application-orchestration/services/application-availability-service.js";
import { ApplicationBundleService } from "./application-bundles/services/application-bundle-service.js";
import { ApplicationPackageRegistryService } from "./application-packages/services/application-package-registry-service.js";
import { ApplicationPlatformStateStore } from "./application-storage/stores/application-platform-state-store.js";
import {
  startChannelRunOutputDeliveryRuntime,
  stopChannelRunOutputDeliveryRuntime,
} from "./external-channel/runtime/channel-run-output-runtime-singleton.js";
import {
  startGatewayCallbackDeliveryRuntime,
  stopGatewayCallbackDeliveryRuntime,
} from "./external-channel/runtime/gateway-callback-delivery-runtime.js";
import { getManagedMessagingGatewayService } from "./managed-capabilities/messaging-gateway/defaults.js";
import { getWorkspaceManager } from "./workspaces/workspace-manager.js";
import { stopMemorySyncWorker } from "./memory-sync/source/memory-sync-worker.js";
import type { ServerOptions } from "./app.js";
import { getSecretVaultRuntime } from "./secret-management/secret-vault-runtime.js";
import { registerProvisionedSearchTool } from "./agent-tools/search/register-search-tool.js";
import { stopDefaultAgentRunEventPipeline } from "./agent-execution/events/default-agent-run-event-pipeline.js";
import { configureFileToolDeniedPaths } from "autobyteus-ts/tools/file/workspace-path-utils.js";
import { TeamRunV1PackageCatalog } from "./run-history/services/team-run-v1-package-catalog.js";
import { exitWithEmbeddedServerPlatformFatal } from "./startup/embedded-server-platform-fatal.js";

const logger = createServerLogger("server.runtime");

export type BuildAppOptions = {
  loggingConfig?: LoggingConfig;
};

export async function buildApp(options?: BuildAppOptions): Promise<FastifyInstance> {
  registerProvisionedSearchTool();
  const loggingConfig = options?.loggingConfig ?? getLoggingConfigFromEnv(process.env);
  const app = fastify({
    logger: getFastifyLoggerOptions(loggingConfig),
    disableRequestLogging: true,
    maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH,
  });
  registerHttpAccessLogPolicy(app, {
    mode: loggingConfig.httpAccessLogMode,
    includeNoisyRoutes: loggingConfig.includeNoisyHttpAccessRoutes,
  });
  const maxUploadFileSizeBytes = 25 * 1024 * 1024;

  await registerAgentToolsMcpRoutes(app);
  await registerMcpGatewayRoutes(app);
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(multipart, {
    limits: {
      fileSize: maxUploadFileSizeBytes,
    },
  });
  await app.register(websocket);

  await registerRemoteAccessPolicyPlugin(app);
  await registerMobileWebStaticRoutes(app);
  await app.register(registerRestRoutes, { prefix: "/rest" });
  await registerWebsocketRoutes(app);
  await registerGraphql(app);
  app.addHook("onClose", async () => {
    try {
      stopMemorySyncWorker();
    } finally {
      try {
        await stopChannelRunOutputDeliveryRuntime();
      } finally {
        try {
          await stopGatewayCallbackDeliveryRuntime();
        } finally {
          try {
            await getManagedMessagingGatewayService().close();
          } finally {
            try {
              await stopDefaultAgentRunEventPipeline();
            } finally {
              try {
                await getSecretVaultRuntime().close();
              } finally {
                await shutdownPrisma();
              }
            }
          }
        }
      }
    }
  });

  return app;
}

function registerShutdownHandlers(app: FastifyInstance): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
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
}

export async function startConfiguredServer(options: ServerOptions): Promise<void> {
  let loggingConfig: LoggingConfig = getLoggingConfigFromEnv(process.env);
  let serverLogPath: string | null = null;

  try {
    loggingConfig = getLoggingConfigFromEnv(process.env);
    serverLogPath = initializeRuntimeLoggerBootstrap({
      logsDir: appConfigProvider.config.getLogsDir(),
      loggingConfig,
    }).logFilePath;
    initializeServerAppLogger(loggingConfig);
  } catch (error) {
    const summary = `Failed to initialize runtime logging: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "RUNTIME_LOGGING_INITIALIZATION_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }

  try {
    const config = appConfigProvider.config;
    runMigrations({
      appRoot: config.getAppRootDir(),
      databaseUrl: config.getOperationalDatabaseUrl(),
    });
  } catch (error) {
    const summary = `Failed to run database migrations: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "DATABASE_MIGRATION_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }

  const databaseLocation = appConfigProvider.config.getOperationalDatabaseLocation();
  configureFileToolDeniedPaths([
    databaseLocation.databasePath,
    databaseLocation.rootKeyPath,
    `${databaseLocation.databasePath}-wal`,
    `${databaseLocation.databasePath}-shm`,
    `${databaseLocation.databasePath}-journal`,
  ]);
  try {
    await initializePrisma({
      datasourceUrl: databaseLocation.databaseUrl,
    });
  } catch (error) {
    const summary = `Failed to initialize application database: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "APPLICATION_DATABASE_INITIALIZATION_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }
  try {
    await getSecretVaultRuntime().initialize(databaseLocation);
  } catch (error) {
    const summary = `Failed to initialize secret vault: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "SECRET_VAULT_INITIALIZATION_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }

  try {
    const statuses = await getAppDataMigrationRunner().runPending();
    await new TeamRunV1PackageCatalog(appConfigProvider.config.getMemoryDir()).rebuild();
    const teamRunV1Status = statuses.find(
      (status) => status.migrationId === TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
    );
    if (teamRunV1Status?.status !== "SUCCEEDED") {
      logger.warn(
        `TeamRun V1 migration did not report clean success; startup continues with strict current-package admission: ${JSON.stringify({
          migrationId: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
          displayName: teamRunV1Status?.displayName ?? null,
          status: teamRunV1Status?.status ?? "MISSING",
          attempts: teamRunV1Status?.attempts ?? null,
          failedCount: teamRunV1Status?.summary?.failedCount ?? null,
          errorMessage: teamRunV1Status?.errorMessage ?? null,
          logPath: teamRunV1Status?.logPath ?? null,
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
    const summary = `Failed to run app data migrations: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "APP_DATA_STARTUP_GATE_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }

  try {
    await bootstrapBuiltInAgents();
  } catch (error) {
    const summary = `Failed to bootstrap built-in agents: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "BUILT_IN_AGENTS_BOOTSTRAP_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }

  const app = await (async (): Promise<FastifyInstance> => {
    try {
      const builtApp = await buildApp({ loggingConfig });
      registerShutdownHandlers(builtApp);
      await builtApp.listen({ host: options.host, port: options.port });
      return builtApp;
    } catch (error) {
      const summary = `Failed to initialize HTTP server: ${String(error)}`;
      logger.error(summary);
      return exitWithEmbeddedServerPlatformFatal({
        code: "HTTP_SERVER_INITIALIZATION_FAILED",
        summary,
        logPath: serverLogPath,
      });
    }
  })();
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

  try {
    await getWorkspaceManager().getOrCreateTempWorkspace();
  } catch (error) {
    const summary = `Failed to create temp workspace: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "TEMP_WORKSPACE_INITIALIZATION_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }

  try {
    const packageRegistrySnapshot = await ApplicationPackageRegistryService.getInstance().getRegistrySnapshot();
    const catalogSnapshot = await ApplicationBundleService.getInstance().getCatalogSnapshot(packageRegistrySnapshot);
    const persistedKnownApplicationIds = await new ApplicationPlatformStateStore().listKnownApplicationIds();
    const availabilityService = getApplicationAvailabilityService();
    await getApplicationOrchestrationStartupGate().runStartupRecovery(async () => {
      const recoveryOutcomes = await getApplicationOrchestrationRecoveryService().resumeBindings(
        catalogSnapshot,
        persistedKnownApplicationIds,
      );
      availabilityService.reconcileCatalogSnapshotWithKnownApplications(catalogSnapshot, {
        persistedKnownApplicationIds,
        recoveryOutcomesByApplicationId: new Map(
          recoveryOutcomes.map((outcome) => [outcome.applicationId, outcome]),
        ),
      });
      await getApplicationExecutionEventDispatchService().resumePendingEvents();
    });
  } catch (error) {
    const summary = `Failed to complete application orchestration startup recovery: ${String(error)}`;
    logger.error(summary);
    exitWithEmbeddedServerPlatformFatal({
      code: "APPLICATION_ORCHESTRATION_RECOVERY_FAILED",
      summary,
      logPath: serverLogPath,
    });
  }
  await scheduleBackgroundTasks();
}
