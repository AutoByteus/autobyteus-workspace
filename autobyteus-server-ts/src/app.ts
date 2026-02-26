import "reflect-metadata";
import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureServerHostEnvVar } from "./utils/env-utils.js";
import { appConfigProvider } from "./config/app-config-provider.js";
import { runMigrations } from "./startup/migrations.js";
import { getLoggingConfigFromEnv, type LoggingConfig } from "./config/logging-config.js";
import { registerHttpAccessLogPolicy } from "./logging/http-access-log-policy.js";
import {
  getFastifyLoggerOptions,
  initializeRuntimeLoggerBootstrap,
} from "./logging/runtime-logger-bootstrap.js";

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
  const {
    attachDiscoveryNodeDirectoryBridge,
    initializeDiscoveryRuntime,
    stopDiscoveryRuntime,
  } = await import("./discovery/runtime/discovery-runtime.js");
  const { getDefaultDistributedRuntimeComposition } = await import(
    "./distributed/bootstrap/default-distributed-runtime-composition.js"
  );
  const { RemoteEventRebroadcastService } = await import(
    "./distributed/event-aggregation/remote-event-rebroadcast-service.js"
  );
  const { registerWorkerDistributedCommandRoutes } = await import(
    "./distributed/transport/internal-http/register-worker-distributed-command-routes.js"
  );
  const { registerWorkerTeamHistoryCleanupRoutes } = await import(
    "./distributed/transport/internal-http/register-worker-team-history-cleanup-routes.js"
  );
  const { registerHostDistributedEventRoutes } = await import(
    "./distributed/transport/internal-http/register-host-distributed-event-routes.js"
  );
  const { TeamHistoryWorkerCleanupHandler } = await import(
    "./run-history/services/team-history-worker-cleanup-handler.js"
  );
  const { TeamHistoryRuntimeStateProbeService } = await import(
    "./run-history/services/team-history-runtime-state-probe-service.js"
  );
  const { configureTeamRunHistoryRuntimeDependencies } = await import(
    "./run-history/services/team-run-history-runtime-dependencies.js"
  );
  const { resetTeamRunHistoryServiceCache } = await import(
    "./run-history/services/team-run-history-service.js"
  );
  const { resetTeamMemberRunProjectionServiceCache } = await import(
    "./run-history/services/team-member-run-projection-service.js"
  );
  const { AgentTeamRunManager } = await import(
    "./agent-team-execution/services/agent-team-run-manager.js"
  );
  const { registerRestRoutes } = await import("./api/rest/index.js");
  const { registerGraphql } = await import("./api/graphql/index.js");
  const { registerWebsocketRoutes } = await import("./api/websocket/index.js");
  const { getAgentTeamStreamHandler } = await import(
    "./services/agent-streaming/agent-team-stream-handler.js"
  );

  initializeDiscoveryRuntime();
  const loggingConfig = options?.loggingConfig ?? getLoggingConfigFromEnv(process.env);
  const app = fastify({
    logger: getFastifyLoggerOptions(loggingConfig),
    // Access logging is managed by registerHttpAccessLogPolicy().
    disableRequestLogging: true,
  });
  registerHttpAccessLogPolicy(app, {
    mode: loggingConfig.httpAccessLogMode,
    includeNoisyRoutes: loggingConfig.includeNoisyHttpAccessRoutes,
  });
  const maxUploadFileSizeBytes = 25 * 1024 * 1024; // 25MB
  const distributedRuntime = getDefaultDistributedRuntimeComposition();
  configureTeamRunHistoryRuntimeDependencies(distributedRuntime);
  resetTeamRunHistoryServiceCache();
  resetTeamMemberRunProjectionServiceCache();
  const teamHistoryWorkerCleanupHandler = new TeamHistoryWorkerCleanupHandler(
    appConfigProvider.config.getMemoryDir(),
  );
  const teamHistoryRuntimeStateProbeService = new TeamHistoryRuntimeStateProbeService({
    teamRunManager: AgentTeamRunManager.getInstance(),
    runBindingRegistry: distributedRuntime.runScopedTeamBindingRegistry,
    localNodeId: distributedRuntime.hostNodeId,
  });
  attachDiscoveryNodeDirectoryBridge(distributedRuntime.nodeDirectoryService);
  const remoteEventRebroadcastService = new RemoteEventRebroadcastService({
    teamRunLocator: distributedRuntime.teamRunLocator,
    teamStreamProjector: getAgentTeamStreamHandler(),
  });

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

  await registerWorkerDistributedCommandRoutes(app, {
    workerNodeBridgeServer: distributedRuntime.workerNodeBridgeServer,
    internalEnvelopeAuth: distributedRuntime.internalEnvelopeAuth,
    securityMode: distributedRuntime.transportSecurityMode,
  });
  await registerWorkerTeamHistoryCleanupRoutes(app, {
    internalEnvelopeAuth: distributedRuntime.internalEnvelopeAuth,
    securityMode: distributedRuntime.transportSecurityMode,
    cleanupHandler: teamHistoryWorkerCleanupHandler,
    runtimeStateProbeService: teamHistoryRuntimeStateProbeService,
  });
  await registerHostDistributedEventRoutes(app, {
    teamEventAggregator: distributedRuntime.teamEventAggregator,
    internalEnvelopeAuth: distributedRuntime.internalEnvelopeAuth,
    runVersionFencingPolicy: distributedRuntime.runVersionFencingPolicy,
    remoteEventIdempotencyPolicy: distributedRuntime.remoteEventIdempotencyPolicy,
    securityMode: distributedRuntime.transportSecurityMode,
    remoteEventRebroadcastService,
  });

  await app.register(registerRestRoutes, { prefix: "/rest" });
  await registerWebsocketRoutes(app);
  await registerGraphql(app);
  app.addHook("onClose", async () => {
    configureTeamRunHistoryRuntimeDependencies(null);
    stopDiscoveryRuntime();
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

  let loggingConfig: LoggingConfig;

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
  const { startDiscoveryRuntime } = await import("./discovery/runtime/discovery-runtime.js");
  await startDiscoveryRuntime();

  try {
    const { getWorkspaceManager } = await import("./workspaces/workspace-manager.js");
    await getWorkspaceManager().getOrCreateTempWorkspace();
  } catch (error) {
    logger.error(`Failed to create temp workspace: ${String(error)}`);
    process.exit(1);
  }
  const { scheduleBackgroundTasks } = await import("./startup/background-runner.js");
  await scheduleBackgroundTasks();
}

const modulePath = pathToFileURL(process.argv[1] ?? "").href;
if (import.meta.url === modulePath) {
  startServer().catch((error) => {
    logger.error(`Failed to start server: ${String(error)}`);
    process.exit(1);
  });
}
