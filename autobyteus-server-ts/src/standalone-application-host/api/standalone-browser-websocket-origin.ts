import type { FastifyRequest } from "fastify";

export const assertStandaloneBrowserWebSocketOrigin = (
  request: FastifyRequest,
): void => {
  const originValue = request.headers.origin?.trim() ?? "";
  const hostValue = request.headers.host?.trim() ?? "";
  if (!originValue || !hostValue) {
    throw new Error("Standalone browser WebSocket ingress requires Origin and Host headers.");
  }
  let origin: URL;
  try {
    origin = new URL(originValue);
  } catch {
    throw new Error("Standalone browser WebSocket Origin is invalid.");
  }
  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    throw new Error("Standalone browser WebSocket Origin must use HTTP or HTTPS.");
  }
  if (origin.host.toLowerCase() !== hostValue.toLowerCase()) {
    throw new Error("Standalone browser WebSocket Origin does not match the request Host.");
  }
};
