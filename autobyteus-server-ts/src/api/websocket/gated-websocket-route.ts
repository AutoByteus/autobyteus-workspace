import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import { getWebSocketRefusal, registerOpenSocket } from "../security/node-access-gate.js";
import type {} from "../security/node-access-plugin.js";
import { webSocketCloseCodeFor } from "../../node-access/domain/node-access-refusal.js";

export type GatedWebSocketHandler<Request extends FastifyRequest = FastifyRequest> = (socket: WebSocket, request: Request) => void;

/**
 * Registers a `/ws/*` route behind the node access gate (design M-3, M-4). The gate's hook decided the upgrade
 * before this runs: a refused upgrade is accepted only to be closed here with 4401/4403 and the refusal code, so the
 * client can tell the reason, and the handler never runs. An accepted socket is registered under its client identity,
 * so a revocation closes it. Handlers never authorize.
 */
export const registerGatedWebSocketRoute = <Request extends FastifyRequest = FastifyRequest>(
  app: FastifyInstance,
  path: string,
  handler: GatedWebSocketHandler<Request>,
): void => {
  app.get(path, { websocket: true, config: { gatedWebSocket: true } }, (socket: WebSocket, request: FastifyRequest) => {
    const refusal = getWebSocketRefusal(request);
    if (refusal) {
      socket.close(webSocketCloseCodeFor(refusal), refusal.code);
      return;
    }
    const unregister = registerOpenSocket(request, socket);
    socket.on("close", unregister);
    handler(socket, request as Request);
  });
};
