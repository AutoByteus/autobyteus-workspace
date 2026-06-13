import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";

const MCP_ROUTE_PREFIX = "/mcp/agent-tools/";
const ALLOWED_METHODS = "GET, POST, DELETE, OPTIONS";

export const registerAgentToolsMcpRequestGate = (
  app: FastifyInstance,
  registry: AgentToolMcpSessionRegistry,
): void => {
  app.addHook("onRequest", async (request, reply) => {
    const sessionId = extractSessionIdFromMcpUrl(request.url);
    if (!sessionId) return;

    const origin = readSingleHeader(request.headers.origin);
    if (!isOriginAllowed(origin)) {
      await sendHttpError(reply, 403, "forbidden", "Forbidden");
      return;
    }
    if (request.method === "OPTIONS") {
      await handleOptions(request, reply);
      return;
    }
    if (!isSupportedRouteMethod(request.method)) {
      await handleUnsupportedRouteMethod(request, reply, registry, sessionId);
    }
  });
};

export const handleOptions = (request: FastifyRequest, reply: FastifyReply) => {
  const origin = readSingleHeader(request.headers.origin);
  if (!isOriginAllowed(origin)) {
    return sendHttpError(reply, 403, "forbidden", "Forbidden");
  }
  applyCorsHeaders(reply, origin);
  return reply.code(204).send();
};

export const sendSseCompatibilityResponse = (reply: FastifyReply) => reply
  .code(200)
  .header("cache-control", "no-cache")
  .header("connection", "keep-alive")
  .type("text/event-stream; charset=utf-8")
  .send(": autobyteus_agent_tools ready\n\n");

export const sendMethodNotAllowed = (reply: FastifyReply) => reply
  .code(405)
  .header("allow", ALLOWED_METHODS)
  .send({ error: "method_not_allowed", message: "Method Not Allowed" });

export const sendHttpError = (
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

export const isSupportedRouteMethod = (method: string): boolean => ["GET", "POST", "DELETE"].includes(method);

export const isJsonContentType = (contentType: string | null): boolean =>
  contentType?.split(";")[0]?.trim().toLowerCase() === "application/json";

export const accepts = (request: FastifyRequest, allowedTypes: string[]): boolean => {
  const accept = readSingleHeader(request.headers.accept);
  if (!accept || accept.trim() === "") return true;
  return accept
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim().toLowerCase())
    .some((entry) => entry === "*/*" || (entry ? allowedTypes.includes(entry) : false));
};

const handleUnsupportedRouteMethod = (
  request: FastifyRequest,
  reply: FastifyReply,
  registry: AgentToolMcpSessionRegistry,
  sessionId: string,
) => {
  const bearerToken = extractBearerToken(readSingleHeader(request.headers.authorization));
  if (!bearerToken) {
    return sendHttpError(reply, 401, "unauthorized", "Unauthorized");
  }
  const resolvedSession = registry.resolveSession({ sessionId, bearerToken });
  if (!resolvedSession.ok) {
    return sendHttpError(reply, 404, "session_unavailable", "Agent tool MCP session is unavailable.");
  }
  return sendMethodNotAllowed(reply);
};

const applyCorsHeaders = (reply: FastifyReply, origin: string | null): void => {
  if (origin) {
    reply.header("access-control-allow-origin", origin);
    reply.header("vary", "Origin");
  }
  reply.header("access-control-allow-methods", ALLOWED_METHODS);
  reply.header("access-control-allow-headers", "authorization, content-type, accept, mcp-protocol-version, mcp-session-id");
};

const extractSessionIdFromMcpUrl = (url: string): string | null => {
  const path = url.split("?")[0] ?? "";
  if (!path.startsWith(MCP_ROUTE_PREFIX)) return null;
  const sessionId = path.slice(MCP_ROUTE_PREFIX.length);
  if (!sessionId || sessionId.includes("/")) return null;
  try {
    return decodeURIComponent(sessionId);
  } catch {
    return sessionId;
  }
};

const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) && isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
};

const isLoopbackHost = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
};
