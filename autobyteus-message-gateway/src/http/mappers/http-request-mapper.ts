import type { FastifyRequest } from "fastify";
import type { InboundHttpRequest } from "../../domain/models/inbound-http-request.js";

export function toInboundHttpRequest(request: FastifyRequest): InboundHttpRequest {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      headers[key.toLowerCase()] = value[0];
    }
  }

  const query: Record<string, string | undefined> = {};
  const queryRecord = request.query as Record<string, unknown>;
  for (const [key, value] of Object.entries(queryRecord ?? {})) {
    if (typeof value === "string") {
      query[key] = value;
    }
  }

  const rawBodyFromHook = (request as FastifyRequest & { rawBody?: string }).rawBody;
  const rawBody =
    typeof rawBodyFromHook === "string"
      ? rawBodyFromHook
      : typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body ?? {});

  return {
    method: request.method,
    path: request.url,
    headers,
    query,
    body: request.body,
    rawBody,
  };
}
