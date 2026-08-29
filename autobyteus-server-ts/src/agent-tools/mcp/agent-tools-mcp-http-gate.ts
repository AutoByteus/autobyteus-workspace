import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import type { AgentToolsMcpLocalAccessGate } from "./agent-tools-mcp-local-access.js";

const MCP_ROUTE_PREFIX = "/mcp/agent-tools/";
const ALLOWED_METHODS = "GET, POST, DELETE, OPTIONS";

export const registerAgentToolsMcpRequestGate = (
  app: FastifyInstance,
  registry: AgentToolMcpSessionRegistry,
  localAccessGate: AgentToolsMcpLocalAccessGate,
): void => {
  app.addHook("onRequest", async (request, reply) => {
    const sessionId = extractSessionIdFromMcpUrl(request.url);
    if (!sessionId) return;

    if (!localAccessGate.validateRequest(request).ok) {
      await sendHttpError(reply, 403, "forbidden", "Forbidden");
      return;
    }
    if (request.method === "OPTIONS") {
      await handleOptions(request, reply);
      return;
    }
    if (!isSupportedRouteMethod(request.method)) {
      await handleUnsupportedRouteMethod(reply, registry, sessionId);
    }
  });
};

export const handleOptions = (request: FastifyRequest, reply: FastifyReply) => {
  applyCorsHeaders(reply, readSingleHeader(request.headers.origin));
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

export const readSingleHeader = (
  value: string | string[] | undefined,
): string | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export const isSupportedRouteMethod = (method: string): boolean =>
  ["GET", "POST", "DELETE"].includes(method);

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
  reply: FastifyReply,
  registry: AgentToolMcpSessionRegistry,
  sessionId: string,
) => {
  const resolvedSession = registry.resolveSession(sessionId);
  if (!resolvedSession.ok) {
    return sendHttpError(
      reply,
      404,
      "session_unavailable",
      "Agent tool MCP session is unavailable.",
    );
  }
  return sendMethodNotAllowed(reply);
};

const applyCorsHeaders = (reply: FastifyReply, origin: string | null): void => {
  if (origin) {
    reply.header("access-control-allow-origin", origin);
    reply.header("vary", "Origin");
  }
  reply.header("access-control-allow-methods", ALLOWED_METHODS);
  reply.header(
    "access-control-allow-headers",
    "content-type, accept, mcp-protocol-version, mcp-session-id",
  );
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
