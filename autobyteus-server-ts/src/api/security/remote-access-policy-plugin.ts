import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import type { RemoteAccessRejection } from "../../remote-access/domain/models.js";
import { getNodeBrowserAccess } from "./node-browser-access.js";
import { refuseRemoteAccessRequest, toLoggableRequestValue } from "./remote-access-refusal.js";
import { createRequestOriginPolicy } from "./remote-access-request-origin.js";
import { getRemoteAccessRoutePolicy, setRemoteAccessAuthContext } from "./remote-access-route-policy.js";

const CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

const ORIGIN_REFUSED: RemoteAccessRejection = {
  ok: false,
  statusCode: 403,
  code: "REMOTE_ACCESS_ORIGIN_REFUSED",
  message: "Requests from this origin are not accepted by this node.",
};

const shouldDeferToWebSocketHandler = (requestUrl: string): boolean => {
  const path = requestUrl.split("?", 1)[0] ?? "";
  return path.startsWith("/ws/");
};

/**
 * The node's origin/auth hook: every HTTP request and WebSocket upgrade that passed the Host gate meets the
 * allowed-origin rule, then route authorization (`/ws/*` upgrades are authorized by their handlers). CORS
 * grants follow the same rule. Register after `registerMcpGatewayRoutes`, whose tool-endpoint origin rule
 * for `/mcp/gateway` runs first.
 */
export async function registerRemoteAccessPolicyPlugin(app: FastifyInstance): Promise<void> {
  const policy = getRemoteAccessRoutePolicy();
  const originPolicy = createRequestOriginPolicy(getNodeBrowserAccess().allowedOrigins);

  // Callback form: @fastify/cors fails every request for a one-argument synchronous delegator.
  // `origin: true` reflects the request's Origin, and grants nothing to a request without one.
  await app.register(cors, {
    delegator: (request, callback) => {
      callback(null, { origin: originPolicy.isAllowed(request.headers), methods: CORS_METHODS });
    },
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!originPolicy.isAllowed(request.headers)) {
      const origin = toLoggableRequestValue(String(request.headers.origin));
      return refuseRemoteAccessRequest(request, reply, ORIGIN_REFUSED, `origin ${origin}`);
    }
    if (shouldDeferToWebSocketHandler(request.url)) {
      return;
    }

    const result = await policy.authorizeHttpRequest(request);
    if (result.ok) {
      setRemoteAccessAuthContext(request, result.context);
      return;
    }
    return refuseRemoteAccessRequest(request, reply, result);
  });
}
