import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  getApplicationBackendNotificationHub,
  type ApplicationBackendNotificationHubConnection,
} from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import {
  authorizeRemoteAccessWebSocket,
  closeSocketForRemoteAccessRejection,
} from "./remote-access-websocket-auth.js";
import { observePendingWebSocketState } from "./pending-websocket-state.js";

type Params = {
  applicationId: string;
};

export async function registerApplicationBackendNotificationWebsocket(
  app: FastifyInstance,
): Promise<void> {
  (app as any).get(
    "/ws/applications/:applicationId/backend/notifications",
    { websocket: true },
    (connection: unknown, req: FastifyRequest<{ Params: Params }>) => {
      const socket = (connection as { socket?: unknown }).socket ?? connection;
      if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
        return;
      }
      const pendingSocket = observePendingWebSocketState(socket as ApplicationBackendNotificationHubConnection & { on: (event: string, listener: (...args: unknown[]) => void) => void });

      void authorizeRemoteAccessWebSocket(req)
        .then(() => {
          if (pendingSocket.isClosed()) return;
          let connectionId: string | null = null;
          const adapter: ApplicationBackendNotificationHubConnection = {
            send: (data: string) => (socket as { send: (payload: string) => void }).send(data),
            close: (code?: number) => (socket as { close: (code?: number) => void }).close(code),
          };

          connectionId = getApplicationBackendNotificationHub().connect((req.params as Params).applicationId, adapter);

          (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
            if (connectionId) {
              getApplicationBackendNotificationHub().disconnect(connectionId);
            }
          });

          (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", () => {
            if (connectionId) {
              getApplicationBackendNotificationHub().disconnect(connectionId);
            }
          });
        })
        .catch((error) => {
          if (!pendingSocket.isClosed()) closeSocketForRemoteAccessRejection(
            socket as { close: (code?: number, reason?: string) => void },
            error,
            req,
          );
        });
    },
  );
}
