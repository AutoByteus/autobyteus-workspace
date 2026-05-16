import type { FastifyRequest } from "fastify";
import {
  WEBSOCKET_ACCESS_TOKEN_QUERY_KEY,
  type RemoteAccessAuthContext,
  type RemoteAccessAuthFailureCode,
  type RemoteAccessRouteClassification,
} from "../../remote-access/domain/models.js";
import { getRemoteAccessAuthService } from "../../remote-access/services/remote-access-auth-service.js";
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

export async function authorizeRemoteAccessWebSocket(
  request: FastifyRequest,
  routeClass: RemoteAccessRouteClassification = "LOCAL_OR_MOBILE_WS",
): Promise<RemoteAccessAuthContext> {
  if (routeClass !== "LOCAL_OR_MOBILE_WS") {
    throw { code: 4404, reason: "REMOTE_ACCESS_ROUTE_UNSUPPORTED" } satisfies RemoteAccessWebSocketRejection;
  }

  const peerAddress = request.raw.socket.remoteAddress;
  if (isLoopbackPeerAddress(peerAddress)) {
    const context: RemoteAccessAuthContext = { mode: "loopback", isAuthenticated: true };
    setRemoteAccessAuthContext(request, context);
    return context;
  }

  const credential = extractRemoteAccessWebSocketCredential(request);
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
