import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ApplicationWebSocketRequest } from "@autobyteus/application-sdk-contracts";
import type { ApplicationBackendRealtimeContract, ApplicationPlatformLifecycleReadiness } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import type { ApplicationBackendNetworkWebSocket } from "../../application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import { authorizeRemoteAccessWebSocket, closeSocketForRemoteAccessRejection } from "./remote-access-websocket-auth.js";
import { observePendingWebSocketState } from "./pending-websocket-state.js";

type Params = { applicationId: string; "*": string };

const toHeaders = (headers: FastifyRequest["headers"]): ApplicationWebSocketRequest["headers"] => {
  const result: ApplicationWebSocketRequest["headers"] = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();
    if (typeof value === "string" || value === undefined) result[normalizedKey] = value;
    if (Array.isArray(value)) result[normalizedKey] = [...value];
  }
  return result;
};

const toQuery = (query: unknown): ApplicationWebSocketRequest["query"] => {
  if (!query || typeof query !== "object" || Array.isArray(query)) return {};
  const result: ApplicationWebSocketRequest["query"] = {};
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (typeof value === "string") result[key] = value;
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) result[key] = value as string[];
  }
  return result;
};

export async function registerApplicationBackendWebsocket(
  app: FastifyInstance,
  dependencies: {
    gateway: ApplicationBackendRealtimeContract;
    lifecycle: ApplicationPlatformLifecycleReadiness;
  },
): Promise<void> {
  (app as any).get(
    "/ws/applications/:applicationId/backend/routes/*",
    { websocket: true },
    (connection: unknown, req: FastifyRequest<{ Params: Params }>) => {
      const socket = ((connection as { socket?: unknown }).socket ?? connection) as ApplicationBackendNetworkWebSocket;
      if (!socket || typeof socket.on !== "function" || typeof socket.send !== "function") return;
      const pendingSocket = observePendingWebSocketState(socket);
      const applicationId = req.params.applicationId;
      const path = `/${req.params["*"] ?? ""}`;
      void authorizeRemoteAccessWebSocket(req).then(() => dependencies.lifecycle.awaitReady()).then(() => {
        if (pendingSocket.isClosed()) return;
        dependencies.gateway.connectApplicationWebSocket({
          applicationId,
          socket,
          request: {
            path,
            params: {},
            query: toQuery(req.query),
            headers: toHeaders(req.headers),
          },
        });
      }).catch((error) => {
        if (!pendingSocket.isClosed()) closeSocketForRemoteAccessRejection(socket, error, req);
      });
    },
  );
}
