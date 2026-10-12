import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  AgentPackageDefinitionChangeConnection,
  AgentPackageDefinitionChangeHub,
} from "../../agent-package-definitions/changes/agent-package-definition-change-hub.js";
import { authorizeRemoteAccessWebSocket, closeSocketForRemoteAccessRejection } from "./remote-access-websocket-auth.js";
import { observePendingWebSocketState } from "./pending-websocket-state.js";

type Socket = AgentPackageDefinitionChangeConnection & { on: (event: string, listener: (...args: unknown[]) => void) => void };

/** `/ws/agent-package-definitions`: which web lists of agent package definitions changed (server → client only). */
export async function registerAgentPackageDefinitionsWebsocket(app: FastifyInstance, hub: AgentPackageDefinitionChangeHub): Promise<void> {
  (app as any).get("/ws/agent-package-definitions", { websocket: true }, (connection: unknown, req: FastifyRequest) => {
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
