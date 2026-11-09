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
import { registerGatedWebSocketRoute } from "./gated-websocket-route.js";
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
  registerGatedWebSocketRoute<FastifyRequest<{ Params: Params }>>(
    app,
    "/ws/applications/:applicationId/agent-communication/*",
    (webSocket, req) => {
      const socket = webSocket as unknown as ApplicationAgentCommunicationNetworkSocket;
      const pendingSocket = observePendingWebSocketState(socket);
      void dependencies.lifecycle.awaitReady().then(() => {
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
      }).catch(() => {
        if (!pendingSocket.isClosed()) socket.close(1011);
      });
    },
  );
}
