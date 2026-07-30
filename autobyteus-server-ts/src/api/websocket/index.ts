import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerAgentWebsocket } from "./agent.js";
import { registerApplicationBackendNotificationWebsocket } from "./application-backend-notifications.js";
import { registerApplicationBackendWebsocket } from "./application-backends.js";
import { registerApplicationAgentCommunicationWebsocket } from "./application-agent-communication.js";
import type { ApplicationPlatformRuntime } from "../../application-platform/runtime/application-platform-runtime.js";

export async function registerWebsocketRoutes(
  app: FastifyInstance,
  applicationRuntime: ApplicationPlatformRuntime,
): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerAgentWebsocket(app);
  await registerApplicationBackendNotificationWebsocket(app, {
    notificationHub: applicationRuntime.notificationHub,
    lifecycle: applicationRuntime.lifecycle,
  });
  await registerApplicationBackendWebsocket(app, {
    gateway: applicationRuntime.backendGateway,
    lifecycle: applicationRuntime.lifecycle,
  });
  await registerApplicationAgentCommunicationWebsocket(app, {
    agentCommunicationService: applicationRuntime.agentCommunicationService,
    lifecycle: applicationRuntime.lifecycle,
  });
}
