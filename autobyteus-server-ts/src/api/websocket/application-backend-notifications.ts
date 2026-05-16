import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  getApplicationBackendNotificationStreamService,
  type ApplicationBackendNotificationStreamConnection,
} from "../../application-backend-gateway/streaming/application-backend-notification-stream-service.js";
import {
  authorizeRemoteAccessWebSocket,
  closeSocketForRemoteAccessRejection,
} from "./remote-access-websocket-auth.js";

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

      void authorizeRemoteAccessWebSocket(req)
        .then(() => {
          let connectionId: string | null = null;
          const adapter: ApplicationBackendNotificationStreamConnection = {
            send: (data: string) => (socket as { send: (payload: string) => void }).send(data),
            close: (code?: number) => (socket as { close: (code?: number) => void }).close(code),
          };

          connectionId = getApplicationBackendNotificationStreamService().connect((req.params as Params).applicationId, adapter);

          (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
            if (connectionId) {
              getApplicationBackendNotificationStreamService().disconnect(connectionId);
            }
          });

          (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", () => {
            if (connectionId) {
              getApplicationBackendNotificationStreamService().disconnect(connectionId);
            }
          });
        })
        .catch((error) => closeSocketForRemoteAccessRejection(
          socket as { close: (code?: number, reason?: string) => void },
          error,
          req,
        ));
    },
  );
}
