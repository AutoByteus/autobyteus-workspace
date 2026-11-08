import type { FastifyInstance } from "fastify";
import {
  getUpdateNotificationChangeHub,
  type UpdateNotificationChangeHub,
} from "../../update-notifications/changes/update-notification-change-messages.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";

/** `/ws/update-notifications`: this node's update-notification change feed (server → client only). */
export async function registerUpdateNotificationsWebsocket(
  app: FastifyInstance,
  hub: UpdateNotificationChangeHub = getUpdateNotificationChangeHub(),
): Promise<void> {
  registerGatedWebSocketRoute(app, "/ws/update-notifications", (socket) => {
    const connectionId = hub.connect({ send: (data) => socket.send(data), close: (code) => socket.close(code) });
    socket.on("close", () => hub.disconnect(connectionId));
    socket.on("error", () => hub.disconnect(connectionId));
  });
}
