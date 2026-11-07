import type { FastifyInstance } from "fastify";
import type { RemoteAccessRejection } from "../../remote-access/domain/models.js";
import { getRemoteAccessPairingService } from "../../remote-access/services/remote-access-pairing-service.js";
import { getNodeBrowserAccess } from "./node-browser-access.js";
import { refuseRemoteAccessRequest, toLoggableRequestValue } from "./remote-access-refusal.js";
import { createRequestHostPolicy } from "./remote-access-request-host.js";
import { parseRequestHostName } from "./request-host-name.js";

const HOST_REFUSED: RemoteAccessRejection = {
  ok: false,
  statusCode: 403,
  code: "REMOTE_ACCESS_HOST_REFUSED",
  message: "Requests addressed to this host name are not accepted by this node.",
};

const describeRefusedHost = (hostHeader: string): string => {
  const name = parseRequestHostName(hostHeader);
  const shown = toLoggableRequestValue(name ?? hostHeader);
  return `host ${shown} (add it to AUTOBYTEUS_ALLOWED_HOSTS if this is the node's name)`;
};

/**
 * The node's first request rule (DNS rebinding defence): every HTTP request and WebSocket upgrade must be
 * addressed to one of the node's names. Register before `registerMcpGatewayRoutes`, so it runs before the
 * MCP gateway hook, CORS preflight answers and the origin/auth hook.
 */
export const registerRemoteAccessHostGate = (app: FastifyInstance): void => {
  const access = getNodeBrowserAccess();
  const pairingService = getRemoteAccessPairingService();
  const hostPolicy = createRequestHostPolicy({
    allowedHostNames: access.allowedHostNames,
    allowedHostSuffixes: access.allowedHostSuffixes,
    isPairedPhoneHost: (hostName) => pairingService.isPairedPhoneHost(hostName),
  });

  app.addHook("onRequest", async (request, reply) => {
    const hostHeader = request.headers.host;
    if (await hostPolicy.isAllowed(hostHeader)) {
      return;
    }
    return refuseRemoteAccessRequest(request, reply, HOST_REFUSED, describeRefusedHost(hostHeader ?? ""));
  });
};
