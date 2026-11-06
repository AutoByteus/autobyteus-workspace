import type { FastifyRequest } from "fastify";
import type {
  RemoteAccessAuthContext,
  RemoteAccessAuthFailureCode,
} from "../../remote-access/domain/models.js";
import {
  getRemoteAccessRoutePolicy,
  readWebSocketQueryCredential,
  setRemoteAccessAuthContext,
} from "../security/remote-access-route-policy.js";
import { redactSensitiveUrl } from "../security/redact-sensitive-url.js";
import { remoteAccessCloseForFailure } from "../../remote-access/domain/remote-access-close-codes.js";

/** The WebSocket query credential as the route policy reads it, for handlers that keep it (node desktop viewers). */
export { readWebSocketQueryCredential };

export type RemoteAccessWebSocketRejection = {
  code: number;
  reason: RemoteAccessAuthFailureCode;
};

/** Adapter for `/ws/*` handlers: the route policy's WebSocket result as a close-code rejection. */
export async function authorizeRemoteAccessWebSocket(request: FastifyRequest): Promise<RemoteAccessAuthContext> {
  const result = await getRemoteAccessRoutePolicy().authorizeWebSocket(request);
  if (!result.ok) {
    throw remoteAccessCloseForFailure(result.code) satisfies RemoteAccessWebSocketRejection;
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
