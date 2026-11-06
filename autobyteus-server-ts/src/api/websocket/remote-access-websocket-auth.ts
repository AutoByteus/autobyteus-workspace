import type { FastifyRequest } from "fastify";
import type {
  RemoteAccessAuthContext,
  RemoteAccessAuthFailureCode,
} from "../../remote-access/domain/models.js";
import { getRemoteAccessRoutePolicy, setRemoteAccessAuthContext } from "../security/remote-access-route-policy.js";
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
  REMOTE_ACCESS_ORIGIN_REFUSED: 4403,
  PHONE_ACCESS_ROUTE_REFUSED: 4403,
};

/** Adapter for `/ws/*` handlers: the route policy's WebSocket result as a close-code rejection. */
export async function authorizeRemoteAccessWebSocket(request: FastifyRequest): Promise<RemoteAccessAuthContext> {
  const result = await getRemoteAccessRoutePolicy().authorizeWebSocket(request);
  if (!result.ok) {
    throw { code: closeCodeByFailure[result.code], reason: result.code } satisfies RemoteAccessWebSocketRejection;
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
