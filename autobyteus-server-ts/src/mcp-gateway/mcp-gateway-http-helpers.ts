import type { FastifyReply, FastifyRequest } from "fastify";

const ALLOWED_METHODS = "GET, POST, DELETE, OPTIONS";

/** Answers a preflight whose Origin the tool-endpoint origin rule has already allowed. */
export const handleGatewayOptions = (request: FastifyRequest, reply: FastifyReply) => {
  applyCorsHeaders(reply, readSingleHeader(request.headers.origin));
  return reply.code(204).send();
};

export const sendGatewayMethodNotAllowed = (reply: FastifyReply) => reply
  .code(405)
  .header("allow", ALLOWED_METHODS)
  .send({ error: "method_not_allowed", message: "Method Not Allowed" });

export const sendGatewayHttpError = (
  reply: FastifyReply,
  statusCode: number,
  error: string,
  message: string,
) => reply.code(statusCode).send({ error, message });

export const readSingleHeader = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export const extractBearerToken = (authorization: string | null): string | null => {
  const match = authorization?.match(/^Bearer\s+(.+)$/i) ?? null;
  const token = match?.[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
};

export const isSupportedGatewayRouteMethod = (method: string): boolean => ["GET", "POST", "DELETE"].includes(method);

export const isGatewayJsonContentType = (contentType: string | null): boolean =>
  contentType?.split(";")[0]?.trim().toLowerCase() === "application/json";

export const accepts = (request: FastifyRequest, allowedTypes: string[]): boolean => {
  const accept = readSingleHeader(request.headers.accept);
  if (!accept || accept.trim() === "") return true;
  return accept
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim().toLowerCase())
    .some((entry) => entry === "*/*" || (entry ? allowedTypes.includes(entry) : false));
};

const applyCorsHeaders = (reply: FastifyReply, origin: string | null): void => {
  if (origin) {
    reply.header("access-control-allow-origin", origin);
    reply.header("vary", "Origin");
  }
  reply.header("access-control-allow-methods", ALLOWED_METHODS);
  reply.header("access-control-allow-headers", "authorization, content-type, accept, mcp-protocol-version, mcp-session-id");
};
