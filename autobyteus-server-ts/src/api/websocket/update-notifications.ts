import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ChangeFeedConnection } from "../../utils/change-feed-hub.js";
import {
  getUpdateNotificationChangeHub,
  type UpdateNotificationChangeHub,
} from "../../update-notifications/changes/update-notification-change-messages.js";
import { authorizeRemoteAccessWebSocket, closeSocketForRemoteAccessRejection } from "./remote-access-websocket-auth.js";
import { observePendingWebSocketState } from "./pending-websocket-state.js";

type Socket = ChangeFeedConnection & { on: (event: string, listener: (...args: unknown[]) => void) => void };

/** `/ws/update-notifications`: this node's update-notification change feed (server → client only). */
export async function registerUpdateNotificationsWebsocket(
  app: FastifyInstance,
  hub: UpdateNotificationChangeHub = getUpdateNotificationChangeHub(),
): Promise<void> {
  (app as any).get("/ws/update-notifications", { websocket: true }, (connection: unknown, req: FastifyRequest) => {
    const socket = ((connection as { socket?: unknown }).socket ?? connection) as Socket;
    if (!socket || typeof socket.on !== "function") return;
    const pending = observePendingWebSocketState(socket);
    void authorizeRemoteAccessWebSocket(req)
      .then(() => {
        if (pending.isClosed()) return;
        const connectionId = hub.connect({ send: (data) => socket.send(data), close: (code) => socket.close(code) });
        socket.on("close", () => hub.disconnect(connectionId));
        socket.on("error", () => hub.disconnect(connectionId));
      })
      .catch((error) => {
        if (!pending.isClosed()) closeSocketForRemoteAccessRejection(socket as unknown as { close: (code?: number, reason?: string) => void }, error, req);
      });
  });
}
