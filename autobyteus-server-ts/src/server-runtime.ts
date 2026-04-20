import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
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
import { scheduleBackgroundTasks } from "./startup/background-runner.js";
import { registerRestRoutes } from "./api/rest/index.js";
import { registerGraphql } from "./api/graphql/index.js";
import { registerWebsocketRoutes } from "./api/websocket/index.js";
import { getApplicationExecutionEventDispatchService } from "./application-orchestration/services/application-execution-event-dispatch-service.js";
import { getApplicationOrchestrationRecoveryService } from "./application-orchestration/services/application-orchestration-recovery-service.js";
import { getApplicationOrchestrationStartupGate } from "./application-orchestration/services/application-orchestration-startup-gate.js";
import { getApplicationAvailabilityService } from "./application-orchestration/services/application-availability-service.js";
import { ApplicationBundleService } from "./application-bundles/services/application-bundle-service.js";
import {
  startReceiptWorkflowRuntime,
  stopReceiptWorkflowRuntime,
} from "./external-channel/runtime/receipt-workflow-runtime-singleton.js";
import {
  startGatewayCallbackDeliveryRuntime,
  stopGatewayCallbackDeliveryRuntime,
} from "./external-channel/runtime/gateway-callback-delivery-runtime.js";
import { getManagedMessagingGatewayService } from "./managed-capabilities/messaging-gateway/defaults.js";
import { getWorkspaceManager } from "./workspaces/workspace-manager.js";
import type { ServerOptions } from "./app.js";

const logger = createServerLogger("server.runtime");

export type BuildAppOptions = {
  loggingConfig?: LoggingConfig;
};

export async function buildApp(options?: BuildAppOptions): Promise<FastifyInstance> {
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

  await app.register(registerRestRoutes, { prefix: "/rest" });
  await registerWebsocketRoutes(app);
  await registerGraphql(app);
  app.addHook("onClose", async () => {
    await stopReceiptWorkflowRuntime();
    await stopGatewayCallbackDeliveryRuntime();
    await getManagedMessagingGatewayService().close();
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

  try {
    loggingConfig = getLoggingConfigFromEnv(process.env);
    initializeRuntimeLoggerBootstrap({
      logsDir: appConfigProvider.config.getLogsDir(),
      loggingConfig,
    });
    initializeServerAppLogger(loggingConfig);
  } catch (error) {
    logger.error(`Failed to initialize runtime logging: ${String(error)}`);
    process.exit(1);
  }

  try {
    runMigrations();
  } catch (error) {
    logger.error(`Failed to run database migrations: ${String(error)}`);
    process.exit(1);
  }

  const app = await buildApp({ loggingConfig });
  registerShutdownHandlers(app);
  await app.listen({ host: options.host, port: options.port });
  logger.info(`Server listening on ${options.host}:${options.port}`);
  startReceiptWorkflowRuntime();
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
    logger.error(`Failed to create temp workspace: ${String(error)}`);
    process.exit(1);
  }

  try {
    const catalogSnapshot = await ApplicationBundleService.getInstance().getCatalogSnapshot();
    getApplicationAvailabilityService().synchronizeWithCatalogSnapshot(catalogSnapshot);
    await getApplicationOrchestrationStartupGate().runStartupRecovery(async () => {
      await getApplicationOrchestrationRecoveryService().resumeBindings(catalogSnapshot);
      await getApplicationExecutionEventDispatchService().resumePendingEvents();
    });
  } catch (error) {
    logger.error(`Failed to complete application orchestration startup recovery: ${String(error)}`);
    process.exit(1);
  }
  await scheduleBackgroundTasks();
}
