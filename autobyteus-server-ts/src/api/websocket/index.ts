import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerAgentWebsocket } from "./agent.js";

export async function registerWebsocketRoutes(app: FastifyInstance): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerAgentWebsocket(app);
}
