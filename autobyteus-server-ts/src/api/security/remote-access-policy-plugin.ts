import cors from "@fastify/cors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { RemoteAccessRejection } from "../../remote-access/domain/models.js";
import { redactSensitiveUrl } from "./redact-sensitive-url.js";
import { createRequestOriginPolicy, parseConfiguredOrigins } from "./remote-access-request-origin.js";
import { getRemoteAccessRoutePolicy, setRemoteAccessAuthContext } from "./remote-access-route-policy.js";

const ALLOWED_ORIGINS_SETTING = "AUTOBYTEUS_ALLOWED_ORIGINS";
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

const readConfiguredOrigins = (): string[] => {
  const { origins, invalidEntries } = parseConfiguredOrigins(
    appConfigProvider.config.get(ALLOWED_ORIGINS_SETTING, "") ?? "",
  );
  if (invalidEntries.length > 0) {
    console.warn(`${ALLOWED_ORIGINS_SETTING}: ignoring entries that are not http(s) origins: ${invalidEntries.join(", ")}`);
  }
  return origins;
};

// The one reply and log line for every refusal this gate sends. Never logs headers or credentials.
const refuse = (
  request: FastifyRequest,
  reply: FastifyReply,
  rejection: RemoteAccessRejection,
  origin?: string,
): FastifyReply => {
  const originPart = origin === undefined ? "" : ` origin ${origin}`;
  console.warn(`Remote Access request refused ${rejection.code} ${redactSensitiveUrl(request.url)}${originPart}`);
  return reply.code(rejection.statusCode).send({
    error: rejection.code,
    code: rejection.code,
    message: rejection.message,
  });
};

/**
 * The node's request gate: every HTTP request and WebSocket upgrade meets the allowed-origin rule first,
 * then route authorization (`/ws/*` upgrades are authorized by their handlers). CORS grants follow the same
 * rule. Register after `registerMcpGatewayRoutes`, whose narrower origin rule for `/mcp/gateway` runs first.
 */
export async function registerRemoteAccessPolicyPlugin(app: FastifyInstance): Promise<void> {
  const policy = getRemoteAccessRoutePolicy();
  const originPolicy = createRequestOriginPolicy(readConfiguredOrigins());

  // Callback form: @fastify/cors fails every request for a one-argument synchronous delegator.
  // `origin: true` reflects the request's Origin, and grants nothing to a request without one.
  await app.register(cors, {
    delegator: (request, callback) => {
      callback(null, { origin: originPolicy.isAllowed(request.headers), methods: CORS_METHODS });
    },
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!originPolicy.isAllowed(request.headers)) {
      return refuse(request, reply, ORIGIN_REFUSED, String(request.headers.origin));
    }
    if (shouldDeferToWebSocketHandler(request.url)) {
      return;
    }

    const result = await policy.authorizeHttpRequest(request);
    if (result.ok) {
      setRemoteAccessAuthContext(request, result.context);
      return;
    }
    return refuse(request, reply, result);
  });
}
