import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
  decodeApplicationAgentTargetPath,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBackendNotificationHub } from "../../application-backend-api-gateway/notifications/application-backend-notification-hub.js";
import type { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import type { ApplicationBackendNetworkWebSocket } from "../../application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import type { ApplicationAgentCommunicationService } from "../../application-agent-communication/services/application-agent-communication-service.js";
import {
  applicationAgentConnectionError,
  type ApplicationAgentCommunicationNetworkSocket,
} from "../../application-agent-communication/domain/application-agent-communication-models.js";
import type { ApplicationPlatformLifecycle } from "../../application-platform/runtime/application-platform-lifecycle.js";
import type { StandaloneApplicationSelection } from "../domain/standalone-application-selection.js";
import { assertStandaloneBrowserWebSocketOrigin } from "./standalone-browser-websocket-origin.js";

type WebSocketConnection = {
  socket?: ApplicationBackendNetworkWebSocket;
};

const resolveSocket = (connection: unknown): ApplicationBackendNetworkWebSocket =>
  ((connection as WebSocketConnection).socket ?? connection) as ApplicationBackendNetworkWebSocket;

const rejectSocket = (
  socket: { close: (code?: number, reason?: string) => void },
  reason = "Standalone application WebSocket rejected",
): void => {
  try {
    socket.close(1008, reason);
  } catch {
    // The connection may already have closed.
  }
};

const authorize = async (
  lifecycle: ApplicationPlatformLifecycle,
  request: FastifyRequest,
): Promise<void> => {
  assertStandaloneBrowserWebSocketOrigin(request);
  await lifecycle.awaitReady();
};

export const registerStandaloneApplicationWebSockets = async (
  app: FastifyInstance,
  dependencies: {
    selection: StandaloneApplicationSelection;
    lifecycle: ApplicationPlatformLifecycle;
    gateway: ApplicationBackendApiGatewayService;
    notificationHub: ApplicationBackendNotificationHub;
    agentCommunicationService: ApplicationAgentCommunicationService;
  },
): Promise<void> => {
  const { applicationId } = dependencies.selection;

  (app as any).get(
    "/_autobyteus/backend/notifications",
    { websocket: true },
    (connection: unknown, request: FastifyRequest) => {
      const socket = resolveSocket(connection);
      void authorize(dependencies.lifecycle, request).then(() => {
        const connectionId = dependencies.notificationHub.connect(applicationId, socket);
        const disconnect = () => dependencies.notificationHub.disconnect(connectionId);
        socket.on("close", disconnect);
        socket.on("error", disconnect);
      }).catch(() => rejectSocket(socket));
    },
  );
  (app as any).get(
    "/_autobyteus/backend/ws/*",
    { websocket: true },
    (connection: unknown, request: FastifyRequest<{ Params: { "*": string } }>) => {
      const socket = resolveSocket(connection);
      void authorize(dependencies.lifecycle, request).then(() => {
        dependencies.gateway.connectApplicationWebSocket({
          applicationId,
          socket,
          request: {
            path: `/${request.params["*"] ?? ""}`,
            params: {},
            query: request.query as Record<string, string | string[]>,
            headers: request.headers,
          },
        });
      }).catch(() => rejectSocket(socket));
    },
  );
  (app as any).get(
    "/_autobyteus/agent/*",
    { websocket: true },
    (connection: unknown, request: FastifyRequest<{ Params: { "*": string } }>) => {
      const socket = resolveSocket(connection) as ApplicationAgentCommunicationNetworkSocket;
      void authorize(dependencies.lifecycle, request).then(() => {
        const address = decodeApplicationAgentTargetPath(`/${request.params["*"] ?? ""}`);
        if (!address) {
          socket.send(JSON.stringify({
            protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
            type: "ERROR",
            error: applicationAgentConnectionError("INVALID_TARGET"),
          }));
          socket.close(1002, "invalid target");
          return;
        }
        dependencies.agentCommunicationService.connect({
          applicationId,
          address,
          socket,
        });
      }).catch(() => rejectSocket(socket));
    },
  );
};
