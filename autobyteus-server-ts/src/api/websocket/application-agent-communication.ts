import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
  decodeApplicationAgentTargetUrl,
} from "@autobyteus/application-sdk-contracts";
import {
  applicationAgentConnectionError,
  type ApplicationAgentCommunicationNetworkSocket,
} from "../../application-agent-communication/domain/application-agent-communication-models.js";
import type { ApplicationAgentCommunicationContract, ApplicationPlatformLifecycleReadiness } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import {
  authorizeRemoteAccessWebSocket,
  closeSocketForRemoteAccessRejection,
} from "./remote-access-websocket-auth.js";
import { observePendingWebSocketState } from "./pending-websocket-state.js";

type Params = { applicationId: string; "*": string };

const readEncodedTargetPath = (req: FastifyRequest<{ Params: Params }>): string => {
  const rawPath = new URL(req.raw.url ?? "/", "http://localhost").pathname;
  const marker = "/agent-communication/";
  const markerIndex = rawPath.lastIndexOf(marker);
  return markerIndex < 0 ? "" : rawPath.slice(markerIndex + marker.length);
};

export async function registerApplicationAgentCommunicationWebsocket(
  app: FastifyInstance,
  dependencies: {
    agentCommunicationService: ApplicationAgentCommunicationContract;
    lifecycle: ApplicationPlatformLifecycleReadiness;
  },
): Promise<void> {
  (app as any).get(
    "/ws/applications/:applicationId/agent-communication/*",
    { websocket: true },
    (connection: unknown, req: FastifyRequest<{ Params: Params }>) => {
      const socket = ((connection as { socket?: unknown }).socket ?? connection) as ApplicationAgentCommunicationNetworkSocket;
      if (!socket || typeof socket.on !== "function" || typeof socket.send !== "function") return;
      const pendingSocket = observePendingWebSocketState(socket);
      void authorizeRemoteAccessWebSocket(req).then(() => dependencies.lifecycle.awaitReady()).then(() => {
        if (pendingSocket.isClosed()) return;
        // Fastify decodes wildcard parameters, including the encoded leading slash
        // in a rooted member address. Decode from the raw URL so the shared codec
        // remains the sole canonical path parser.
        const address = decodeApplicationAgentTargetUrl(`/${readEncodedTargetPath(req)}`);
        if (!address) {
          socket.send(JSON.stringify({
            protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
            type: "ERROR",
            error: applicationAgentConnectionError("INVALID_TARGET"),
          }));
          socket.send(JSON.stringify({
            protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
            type: "CLOSED",
            close: { reason: "ESTABLISHMENT_FAILED" },
          }));
          socket.close(1002, "invalid target");
          return;
        }
        dependencies.agentCommunicationService.connect({
          applicationId: req.params.applicationId,
          address,
          socket,
        });
      }).catch((error) => {
        if (!pendingSocket.isClosed()) closeSocketForRemoteAccessRejection(socket, error, req);
      });
    },
  );
}
