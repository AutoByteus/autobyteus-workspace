import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerAgentWebsocket } from "./agent.js";
import { registerApplicationBackendNotificationWebsocket } from "./application-backend-notifications.js";
import { registerApplicationBackendWebsocket } from "./application-backends.js";
import { registerApplicationAgentCommunicationWebsocket } from "./application-agent-communication.js";

export async function registerWebsocketRoutes(app: FastifyInstance): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerAgentWebsocket(app);
  await registerApplicationBackendNotificationWebsocket(app);
  await registerApplicationBackendWebsocket(app);
  await registerApplicationAgentCommunicationWebsocket(app);
}
