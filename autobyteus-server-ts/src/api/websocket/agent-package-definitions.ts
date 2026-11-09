import type { FastifyInstance } from "fastify";
import type { AgentPackageDefinitionChangeHub } from "../../agent-package-definitions/changes/agent-package-definition-change-hub.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";

/** `/ws/agent-package-definitions`: which web lists of agent package definitions changed (server → client only). */
export async function registerAgentPackageDefinitionsWebsocket(app: FastifyInstance, hub: AgentPackageDefinitionChangeHub): Promise<void> {
  registerGatedWebSocketRoute(app, "/ws/agent-package-definitions", (socket) => {
    const connectionId = hub.connect({ send: (data) => socket.send(data), close: (code) => socket.close(code) });
    socket.on("close", () => hub.disconnect(connectionId));
    socket.on("error", () => hub.disconnect(connectionId));
  });
}
