import type { FastifyRequest } from "fastify";
import {
  WEBSOCKET_ACCESS_TOKEN_QUERY_KEY,
  type RemoteAccessAuthContext,
  type RemoteAccessAuthFailureCode,
  type RemoteAccessRouteClassification,
} from "../../remote-access/domain/models.js";
import {
  getRemoteAccessAuthService,
  isMobileRemoteAccessCredential,
} from "../../remote-access/services/remote-access-auth-service.js";
import { isLoopbackClientAddress } from "../security/remote-access-local-trust.js";
import { setRemoteAccessAuthContext } from "../security/remote-access-route-policy.js";
import { redactSensitiveUrl } from "../security/redact-sensitive-url.js";
import { remoteAccessCloseForFailure } from "../../remote-access/domain/remote-access-close-codes.js";

export type RemoteAccessWebSocketRejection = {
  code: number;
  reason: RemoteAccessAuthFailureCode;
};

const parseRequestUrl = (request: FastifyRequest): URL =>
  new URL(request.url, "http://autobyteus.local");

export const extractRemoteAccessWebSocketCredential = (request: FastifyRequest): string | null => {
  try {
    const parsed = parseRequestUrl(request);
    return parsed.searchParams.get(WEBSOCKET_ACCESS_TOKEN_QUERY_KEY)?.trim() || null;
  } catch {
    return null;
  }
};

const trustedNetworkContext = (clientAddress?: string): RemoteAccessAuthContext => {
  const isLoopback = isLoopbackClientAddress(clientAddress);
  return {
    mode: isLoopback ? "loopback" : "trusted_network",
    isAuthenticated: isLoopback,
  };
};

export async function authorizeRemoteAccessWebSocket(
  request: FastifyRequest,
  routeClass: RemoteAccessRouteClassification = "TRUSTED_NETWORK_WEBSOCKET",
): Promise<RemoteAccessAuthContext> {
  if (routeClass !== "TRUSTED_NETWORK_WEBSOCKET") {
    throw { code: 4404, reason: "REMOTE_ACCESS_ROUTE_UNSUPPORTED" } satisfies RemoteAccessWebSocketRejection;
  }

  const credential = extractRemoteAccessWebSocketCredential(request);
  if (isMobileRemoteAccessCredential(credential)) {
    const result = await getRemoteAccessAuthService().authorizeMobileCredential(credential);
    if (!result.ok) {
      throw remoteAccessCloseForFailure(result.code) satisfies RemoteAccessWebSocketRejection;
    }
    setRemoteAccessAuthContext(request, result.context);
    return result.context;
  }

  const context = trustedNetworkContext(request.raw.socket.remoteAddress);
  setRemoteAccessAuthContext(request, context);
  return context;
}

export const closeSocketForRemoteAccessRejection = (
  socket: { close: (code?: number, reason?: string) => void },
  error: unknown,
  request?: FastifyRequest,
): void => {
  const rejection = isWebSocketRejection(error)
    ? error
    : { code: 4401, reason: "REMOTE_ACCESS_AUTH_INVALID" as const };
  if (request) {
    console.warn(
      `Remote Access WebSocket rejected ${redactSensitiveUrl(request.url)}: ${rejection.reason}`,
    );
  }
  try {
    socket.close(rejection.code, rejection.reason);
  } catch {
    // Ignore close failures.
  }
};

const isWebSocketRejection = (value: unknown): value is RemoteAccessWebSocketRejection => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RemoteAccessWebSocketRejection>;
  return typeof candidate.code === "number" && typeof candidate.reason === "string";
};
