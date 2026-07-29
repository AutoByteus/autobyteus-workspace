import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerAgentWebsocket } from "./agent.js";
import { registerApplicationBackendNotificationWebsocket } from "./application-backend-notifications.js";
import { registerApplicationBackendWebsocket } from "./application-backends.js";
import { registerApplicationAgentCommunicationWebsocket } from "./application-agent-communication.js";
import type { ApplicationPlatformRuntimeGraph } from "../../application-platform/runtime/application-platform-runtime-graph.js";

export async function registerWebsocketRoutes(
  app: FastifyInstance,
  applicationGraph: ApplicationPlatformRuntimeGraph,
): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerAgentWebsocket(app);
  await registerApplicationBackendNotificationWebsocket(app, {
    notificationHub: applicationGraph.notificationHub,
    lifecycle: applicationGraph.lifecycle,
  });
  await registerApplicationBackendWebsocket(app, {
    gateway: applicationGraph.backendGateway,
    lifecycle: applicationGraph.lifecycle,
  });
  await registerApplicationAgentCommunicationWebsocket(app, {
    agentCommunicationService: applicationGraph.agentCommunicationService,
    lifecycle: applicationGraph.lifecycle,
  });
}
