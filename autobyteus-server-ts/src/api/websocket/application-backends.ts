import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ApplicationBackendRealtimeContract, ApplicationPlatformLifecycleReadiness } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import type { ApplicationBackendNetworkWebSocket } from "../../application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";
import { toApplicationHeaderRecord, toApplicationQueryRecord } from "../rest/application-backend-route-handlers.js";
import { observePendingWebSocketState } from "./pending-websocket-state.js";

type Params = { applicationId: string; "*": string };

export async function registerApplicationBackendWebsocket(
  app: FastifyInstance,
  dependencies: {
    gateway: ApplicationBackendRealtimeContract;
    lifecycle: ApplicationPlatformLifecycleReadiness;
  },
): Promise<void> {
  registerGatedWebSocketRoute<FastifyRequest<{ Params: Params }>>(
    app,
    "/ws/applications/:applicationId/backend/routes/*",
    (webSocket, req) => {
      const socket = webSocket as unknown as ApplicationBackendNetworkWebSocket;
      const pendingSocket = observePendingWebSocketState(socket);
      const applicationId = req.params.applicationId;
      const path = `/${req.params["*"] ?? ""}`;
      void dependencies.lifecycle.awaitReady().then(() => {
        if (pendingSocket.isClosed()) return;
        dependencies.gateway.connectApplicationWebSocket({
          applicationId,
          socket,
          request: {
            path,
            params: {},
            query: toApplicationQueryRecord(req.query),
            headers: toApplicationHeaderRecord(req.headers),
          },
        });
      }).catch(() => {
        if (!pendingSocket.isClosed()) socket.close(1011);
      });
    },
  );
}
