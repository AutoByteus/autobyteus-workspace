import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ApplicationBackendNotificationHubConnection } from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import type { ApplicationBackendNotificationContract, ApplicationPlatformLifecycleReadiness } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";
import { observePendingWebSocketState } from "./pending-websocket-state.js";

type Params = {
  applicationId: string;
};

export async function registerApplicationBackendNotificationWebsocket(
  app: FastifyInstance,
  dependencies: {
    notificationHub: ApplicationBackendNotificationContract;
    lifecycle: ApplicationPlatformLifecycleReadiness;
  },
): Promise<void> {
  registerGatedWebSocketRoute<FastifyRequest<{ Params: Params }>>(
    app,
    "/ws/applications/:applicationId/backend/notifications",
    (socket, req) => {
      const pendingSocket = observePendingWebSocketState(socket);
      void dependencies.lifecycle.awaitReady()
        .then(() => {
          if (pendingSocket.isClosed()) return;
          const adapter: ApplicationBackendNotificationHubConnection = {
            send: (data: string) => socket.send(data),
            close: (code?: number) => socket.close(code),
          };
          const connectionId = dependencies.notificationHub.connect(req.params.applicationId, adapter);
          socket.on("close", () => dependencies.notificationHub.disconnect(connectionId));
          socket.on("error", () => dependencies.notificationHub.disconnect(connectionId));
        })
        .catch(() => {
          if (!pendingSocket.isClosed()) socket.close(1011);
        });
    },
  );
}
