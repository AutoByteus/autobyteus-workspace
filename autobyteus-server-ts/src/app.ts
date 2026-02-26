import "reflect-metadata";
import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ensureServerHostEnvVar } from "./utils/env-utils.js";
import { appConfigProvider } from "./config/app-config-provider.js";
import { runMigrations } from "./startup/migrations.js";
import { scheduleBackgroundTasks } from "./startup/background-runner.js";
import { registerRestRoutes } from "./api/rest/index.js";
import { registerGraphql } from "./api/graphql/index.js";
import { registerWebsocketRoutes } from "./api/websocket/index.js";
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

export async function buildApp(): Promise<FastifyInstance> {
  const disableHttpRequestLogging = process.env.DISABLE_HTTP_REQUEST_LOGS !== "false";
  const app = fastify({
    logger: true,
    disableRequestLogging: disableHttpRequestLogging,
  });
  const maxUploadFileSizeBytes = 25 * 1024 * 1024; // 25MB

  logger.info(
    `Fastify HTTP request logging is ${disableHttpRequestLogging ? "disabled" : "enabled"}.`,
  );

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

  try {
    initializeConfig(options);
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

  const app = await buildApp();
  registerShutdownHandlers(app);
  await app.listen({ host: options.host, port: options.port });
  logger.info(`Server listening on ${options.host}:${options.port}`);

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
