import type { FastifyInstance } from "fastify";
import { registerFileExplorerWebsocket } from "./file-explorer.js";
import { registerTerminalWebsocket } from "./terminal.js";
import { registerAgentWebsocket } from "./agent.js";
import { registerApplicationBackendNotificationWebsocket } from "./application-backend-notifications.js";
import { registerApplicationBackendWebsocket } from "./application-backends.js";
import { registerApplicationAgentCommunicationWebsocket } from "./application-agent-communication.js";
import type { ApplicationPlatformLifecycleReadiness, ApplicationPlatformRealtimeContracts } from "../../application-platform/runtime/application-platform-runtime-contracts.js";

export async function registerWebsocketRoutes(
  app: FastifyInstance,
  dependencies: {
    lifecycleReadiness: ApplicationPlatformLifecycleReadiness;
    application: ApplicationPlatformRealtimeContracts;
  },
): Promise<void> {
  await registerFileExplorerWebsocket(app);
  await registerTerminalWebsocket(app);
  await registerAgentWebsocket(app);
  await registerApplicationBackendNotificationWebsocket(app, {
    notificationHub: dependencies.application.notifications,
    lifecycle: dependencies.lifecycleReadiness,
  });
  await registerApplicationBackendWebsocket(app, {
    gateway: dependencies.application.backend,
    lifecycle: dependencies.lifecycleReadiness,
  });
  await registerApplicationAgentCommunicationWebsocket(app, {
    agentCommunicationService: dependencies.application.agentCommunication,
    lifecycle: dependencies.lifecycleReadiness,
  });
}
