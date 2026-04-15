import type { FastifyInstance } from "fastify";
import {
  getApplicationNotificationStreamService,
  type ApplicationNotificationStreamConnection,
} from "../../application-backend-gateway/streaming/application-notification-stream-service.js";

type Params = {
  applicationId: string;
};

export async function registerApplicationBackendNotificationWebsocket(
  app: FastifyInstance,
): Promise<void> {
  (app as any).get(
    "/ws/applications/:applicationId/backend/notifications",
    { websocket: true },
    (connection: unknown, req: { params: Params }) => {
      let connectionId: string | null = null;
      const socket = (connection as { socket?: unknown }).socket ?? connection;
      if (!socket || typeof (socket as { on?: unknown }).on !== "function") {
        return;
      }

      const adapter: ApplicationNotificationStreamConnection = {
        send: (data: string) => (socket as { send: (payload: string) => void }).send(data),
        close: (code?: number) => (socket as { close: (code?: number) => void }).close(code),
      };

      connectionId = getApplicationNotificationStreamService().connect(req.params.applicationId, adapter);

      (socket as { on: (event: string, cb: () => void) => void }).on("close", () => {
        if (connectionId) {
          getApplicationNotificationStreamService().disconnect(connectionId);
        }
      });

      (socket as { on: (event: string, cb: (error: unknown) => void) => void }).on("error", () => {
        if (connectionId) {
          getApplicationNotificationStreamService().disconnect(connectionId);
        }
      });
    },
  );
}
