import "reflect-metadata";
import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrlFromListenAddress,
} from "./config/server-runtime-endpoints.js";
import { ensureServerHostEnvVar } from "./utils/env-utils.js";
import { appConfigProvider } from "./config/app-config-provider.js";
import { getLoggingConfigFromEnv, type LoggingConfig } from "./config/logging-config.js";
import { registerHttpAccessLogPolicy } from "./logging/http-access-log-policy.js";
import {
  getFastifyLoggerOptions,
  initializeRuntimeLoggerBootstrap,
} from "./logging/runtime-logger-bootstrap.js";
import { runMigrations } from "./startup/migrations.js";
import { scheduleBackgroundTasks } from "./startup/background-runner.js";
import { registerRestRoutes } from "./api/rest/index.js";
import { registerGraphql } from "./api/graphql/index.js";
import { registerWebsocketRoutes } from "./api/websocket/index.js";
import {
  startGatewayCallbackDeliveryRuntime,
  stopGatewayCallbackDeliveryRuntime,
} from "./external-channel/runtime/gateway-callback-delivery-runtime.js";
import { getManagedMessagingGatewayService } from "./managed-capabilities/messaging-gateway/defaults.js";
import { getWorkspaceManager } from "./workspaces/workspace-manager.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type ServerOptions = {
  host: string;
  port: number;
  dataDir?: string;
};

function parseArgs(argv: string[]): ServerOptions {
  const options: ServerOptions = { host: "0.0.0.0", port: 8000 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("-")) {
      continue;
    }

    if (arg === "--port" && argv[i + 1]) {
      options.port = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = Number(arg.split("=", 2)[1]);
      continue;
    }
    if (arg === "--host" && argv[i + 1]) {
      options.host = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--host=")) {
      options.host = arg.split("=", 2)[1];
      continue;
    }
    if (arg === "--data-dir" && argv[i + 1]) {
      options.dataDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--data-dir=")) {
      options.dataDir = arg.split("=", 2)[1];
    }
  }

  return options;
}

function initializeConfig(options: ServerOptions) {
  const config = appConfigProvider.config;
  if (options.dataDir) {
    config.setCustomAppDataDir(options.dataDir);
  }
  config.initialize();
  return config;
}

type BuildAppOptions = {
  loggingConfig?: LoggingConfig;
};

export async function buildApp(options?: BuildAppOptions): Promise<FastifyInstance> {
  const loggingConfig = options?.loggingConfig ?? getLoggingConfigFromEnv(process.env);
  const app = fastify({
    logger: getFastifyLoggerOptions(loggingConfig),
    // Access logging is handled by registerHttpAccessLogPolicy.
    disableRequestLogging: true,
  });
  registerHttpAccessLogPolicy(app, {
    mode: loggingConfig.httpAccessLogMode,
    includeNoisyRoutes: loggingConfig.includeNoisyHttpAccessRoutes,
  });
  const maxUploadFileSizeBytes = 25 * 1024 * 1024; // 25MB

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

export async function startServer(): Promise<void> {
  const options = parseArgs(process.argv);

  ensureServerHostEnvVar(options.host, options.port);
  let loggingConfig: LoggingConfig = getLoggingConfigFromEnv(process.env);

  try {
    initializeConfig(options);
    loggingConfig = getLoggingConfigFromEnv(process.env);
    initializeRuntimeLoggerBootstrap({
      logsDir: appConfigProvider.config.getLogsDir(),
    });
  } catch (error) {
    logger.error(`Failed to initialize AppConfig: ${String(error)}`);
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
  await scheduleBackgroundTasks();
}

const modulePath = pathToFileURL(process.argv[1] ?? "").href;
if (import.meta.url === modulePath) {
  startServer().catch((error) => {
    logger.error(`Failed to start server: ${String(error)}`);
    process.exit(1);
  });
}
