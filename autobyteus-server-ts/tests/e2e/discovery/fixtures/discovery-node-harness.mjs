import fastify from "fastify";
import { appConfigProvider } from "../../../../dist/config/app-config-provider.js";
import { registerNodeDiscoveryRoutes } from "../../../../dist/api/rest/node-discovery.js";
import {
  initializeDiscoveryRuntime,
  startDiscoveryRuntime,
  stopDiscoveryRuntime,
} from "../../../../dist/discovery/runtime/discovery-runtime.js";

const host = process.env.SMOKE_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.SMOKE_PORT ?? "", 10);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`SMOKE_PORT must be a positive integer. Received: '${process.env.SMOKE_PORT ?? ""}'.`);
}

if (process.env.SMOKE_DATA_DIR) {
  appConfigProvider.config.setCustomAppDataDir(process.env.SMOKE_DATA_DIR);
}

const app = fastify({ logger: false });
initializeDiscoveryRuntime();

app.get("/rest/health", async () => ({ status: "ok" }));
await app.register(
  async (instance) => {
    await registerNodeDiscoveryRoutes(instance);
  },
  { prefix: "/rest" },
);

await app.listen({ host, port });
await startDiscoveryRuntime();

const shutdown = async () => {
  stopDiscoveryRuntime();
  await app.close();
};

process.once("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});
