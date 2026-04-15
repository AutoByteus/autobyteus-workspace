import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerAgentWebsocket } from "./agent.js";
import { registerApplicationSessionWebsocket } from "./application-session.js";
import { registerApplicationBackendNotificationWebsocket } from "./application-backend-notifications.js";

export async function registerWebsocketRoutes(app: FastifyInstance): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerAgentWebsocket(app);
  await registerApplicationSessionWebsocket(app);
  await registerApplicationBackendNotificationWebsocket(app);
}
