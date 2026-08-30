import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import { AgentToolsMcpMethodDispatcher } from "./agent-tools-mcp-method-dispatcher.js";
import {
  getAgentToolsMcpResultMapper,
  type JsonRpcId,
} from "./agent-tools-mcp-result-mapper.js";
import {
  accepts,
  handleOptions,
  isJsonContentType,
  isSupportedRouteMethod,
  readSingleHeader,
  registerAgentToolsMcpRequestGate,
  sendHttpError,
  sendMethodNotAllowed,
  sendSseCompatibilityResponse,
} from "./agent-tools-mcp-http-gate.js";
import type { AgentToolsMcpLocalAccessGate } from "./agent-tools-mcp-local-access.js";

const MCP_ROUTE = "/mcp/agent-tools/:sessionId";
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-03-26", "2025-06-18", "2025-11-25"]);
const DEFAULT_PROTOCOL_VERSION = "2025-03-26";

export type AgentToolsMcpRouteDependencies = Readonly<{
  registry: AgentToolMcpSessionRegistry;
  dispatcher: AgentToolsMcpMethodDispatcher;
  localAccessGate: AgentToolsMcpLocalAccessGate;
}>;

type AgentToolsMcpRouteParams = {
  sessionId: string;
};

export async function registerAgentToolsMcpRoutes(
  app: FastifyInstance,
  deps: AgentToolsMcpRouteDependencies,
): Promise<void> {
  const { registry, dispatcher, localAccessGate } = deps;

  registerAgentToolsMcpRequestGate(app, registry, localAccessGate);
  await app.register(async (mcpApp) => {
    registerRawBodyParsers(mcpApp);

    mcpApp.all<{ Params: AgentToolsMcpRouteParams; Body: unknown }>(
      MCP_ROUTE,
      { config: { cors: false } },
      async (request, reply) => handleAgentToolsMcpRequest({ request, reply, registry, dispatcher }),
    );
  });
}

const registerRawBodyParsers = (app: FastifyInstance): void => {
  try {
    app.removeContentTypeParser("application/json");
  } catch {
    // Parser removal is best-effort inside this encapsulated MCP plugin.
  }
  app.addContentTypeParser(/^application\/json(?:\s*;.*)?$/i, { parseAs: "string" }, (_request, body, done) => {
    done(null, body);
  });
  app.addContentTypeParser("*", { parseAs: "string" }, (_request, body, done) => {
    done(null, body);
  });
};

const handleAgentToolsMcpRequest = async (input: {
  request: FastifyRequest<{ Params: AgentToolsMcpRouteParams; Body: unknown }>;
  reply: FastifyReply;
  registry: AgentToolMcpSessionRegistry;
  dispatcher: AgentToolsMcpMethodDispatcher;
}) => {
  const { request, reply, registry, dispatcher } = input;
  if (request.method === "OPTIONS") {
    return handleOptions(request, reply);
  }

  const resolvedSession = registry.resolveSession(request.params.sessionId);
  if (!resolvedSession.ok) {
    return sendHttpError(reply, 404, "session_unavailable", "Agent tool MCP session is unavailable.");
  }

  if (!isSupportedRouteMethod(request.method)) {
    return sendMethodNotAllowed(reply);
  }

  const protocolVersion = resolveProtocolVersion(readSingleHeader(request.headers["mcp-protocol-version"]));
  if (!protocolVersion.ok) {
    return sendJsonRpcRouteError(reply, 400, -32600, protocolVersion.message, null);
  }

  if (request.method === "DELETE") {
    return sendMethodNotAllowed(reply);
  }
  if (request.method === "GET") {
    if (!accepts(request, ["text/event-stream"])) {
      return sendHttpError(reply, 406, "not_acceptable", "Not Acceptable");
    }
    return sendSseCompatibilityResponse(reply);
  }

  if (!isJsonContentType(readSingleHeader(request.headers["content-type"]))) {
    return sendHttpError(reply, 415, "unsupported_media_type", "Unsupported Media Type");
  }
  if (!accepts(request, ["application/json", "text/event-stream"])) {
    return sendHttpError(reply, 406, "not_acceptable", "Not Acceptable");
  }

  const parseResult = parseJsonRpcBody(request.body);
  if (!parseResult.ok) {
    return sendJsonRpcRouteError(reply, 400, -32700, "Parse error", null);
  }

  const dispatchResult = await dispatcher.dispatch({
    payload: parseResult.payload,
    session: resolvedSession.session,
    protocolVersion: protocolVersion.version,
  });
  if (dispatchResult.kind === "empty") {
    return reply.code(dispatchResult.statusCode).send();
  }
  return reply.code(dispatchResult.statusCode).type("application/json; charset=utf-8").send(dispatchResult.body);
};

const sendJsonRpcRouteError = (
  reply: FastifyReply,
  statusCode: number,
  code: -32700 | -32600,
  message: string,
  id: JsonRpcId,
) => {
  const mapper = getAgentToolsMcpResultMapper();
  return reply.code(statusCode).type("application/json; charset=utf-8").send(mapper.jsonRpcError(id, code, message));
};

const resolveProtocolVersion = (rawProtocolVersion: string | null):
  { ok: true; version: string } | { ok: false; message: string } => {
  const version = rawProtocolVersion?.trim() || DEFAULT_PROTOCOL_VERSION;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) {
    return { ok: false, message: "Invalid MCP protocol version" };
  }
  if (!SUPPORTED_PROTOCOL_VERSIONS.has(version)) {
    return { ok: false, message: "Unsupported MCP protocol version" };
  }
  return { ok: true, version };
};

const parseJsonRpcBody = (body: unknown): { ok: true; payload: unknown } | { ok: false } => {
  const text = typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString("utf8") : JSON.stringify(body);
  try {
    return { ok: true, payload: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};
