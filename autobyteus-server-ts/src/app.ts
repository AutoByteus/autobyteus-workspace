import "reflect-metadata";
import { pathToFileURL } from "node:url";
import { appConfigProvider } from "./config/app-config-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export type ServerOptions = {
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
  const config = appConfigProvider.initialize({
    appDataDir: options.dataDir,
  });
  config.initialize();
  return config;
}

export async function startServer(): Promise<void> {
  const options = parseArgs(process.argv);

  try {
    initializeConfig(options);
  } catch (error) {
    logger.error(`Failed to initialize AppConfig: ${String(error)}`);
    process.exit(1);
  }

  const runtime = await import("./server-runtime.js");
  await runtime.startConfiguredServer(options);
}

const modulePath = pathToFileURL(process.argv[1] ?? "").href;
if (import.meta.url === modulePath) {
  startServer().catch((error) => {
    logger.error(`Failed to start server: ${String(error)}`);
    process.exit(1);
  });
}
