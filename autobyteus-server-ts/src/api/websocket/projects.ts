import type { FastifyInstance } from "fastify";
import { getProjectChangeHub, type ProjectChangeHub } from "../../projects/changes/project-change-hub.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";

/** `/ws/projects`: this node's Project and Task change feed (server → client only). */
export async function registerProjectChangesWebsocket(app: FastifyInstance, hub: ProjectChangeHub = getProjectChangeHub()): Promise<void> {
  registerGatedWebSocketRoute(app, "/ws/projects", (socket) => {
    const connectionId = hub.connect({ send: (data) => socket.send(data), close: (code) => socket.close(code) });
    socket.on("close", () => hub.disconnect(connectionId));
    socket.on("error", () => hub.disconnect(connectionId));
  });
}
