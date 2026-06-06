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
import { isLoopbackPeerAddress } from "../security/remote-access-local-trust.js";
import { setRemoteAccessAuthContext } from "../security/remote-access-route-policy.js";
import { redactSensitiveUrl } from "../security/redact-sensitive-url.js";

export type RemoteAccessWebSocketRejection = {
  code: number;
  reason: RemoteAccessAuthFailureCode;
};

const closeCodeByFailure: Record<RemoteAccessAuthFailureCode, number> = {
  REMOTE_ACCESS_AUTH_REQUIRED: 4401,
  REMOTE_ACCESS_AUTH_INVALID: 4401,
  REMOTE_ACCESS_DEVICE_REVOKED: 4403,
  PHONE_ACCESS_DISABLED: 4403,
  REMOTE_ACCESS_ROUTE_UNSUPPORTED: 4404,
  REMOTE_ACCESS_LOCAL_ONLY: 4403,
  REMOTE_ACCESS_PAIRING_EXPIRED: 4401,
  REMOTE_ACCESS_PAIRING_INVALID: 4401,
  REMOTE_ACCESS_PAIRING_CONSUMED: 4401,
  REMOTE_ACCESS_PAIRING_URL_INVALID: 4403,
  REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY: 4403,
  REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED: 4403,
  REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED: 4403,
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

const trustedNetworkContext = (peerAddress?: string): RemoteAccessAuthContext => {
  const isLoopback = isLoopbackPeerAddress(peerAddress);
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
      throw {
        code: closeCodeByFailure[result.code] ?? 4401,
        reason: result.code,
      } satisfies RemoteAccessWebSocketRejection;
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
