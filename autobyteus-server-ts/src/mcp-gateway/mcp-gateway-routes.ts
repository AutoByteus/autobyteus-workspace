import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  accepts,
  handleGatewayOptions,
  isGatewayJsonContentType,
  isOriginAllowed,
  isSupportedGatewayRouteMethod,
  readSingleHeader,
  sendGatewayHttpError,
  sendGatewayMethodNotAllowed,
} from "./mcp-gateway-http-helpers.js";
import {
  getMcpGatewayResultMapper,
  type JsonRpcId,
} from "./mcp-gateway-result-mapper.js";
import {
  McpGatewayAccessGate,
  getMcpGatewayAccessGate,
} from "./mcp-gateway-access.js";
import {
  McpGatewayMethodDispatcher,
  getMcpGatewayMethodDispatcher,
} from "./mcp-gateway-method-dispatcher.js";

const MCP_GATEWAY_ROUTE = "/mcp/gateway";
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-03-26", "2025-06-18", "2025-11-25"]);
const DEFAULT_PROTOCOL_VERSION = "2025-03-26";

type McpGatewayRouteDeps = {
  accessGate?: McpGatewayAccessGate;
  dispatcher?: McpGatewayMethodDispatcher;
};

export async function registerMcpGatewayRoutes(
  app: FastifyInstance,
  deps: McpGatewayRouteDeps = {},
): Promise<void> {
  const accessGate = deps.accessGate ?? getMcpGatewayAccessGate();
  const dispatcher = deps.dispatcher ?? getMcpGatewayMethodDispatcher();

  registerMcpGatewayRequestGate(app, accessGate);
  await app.register(async (mcpApp) => {
    registerRawBodyParsers(mcpApp);
    mcpApp.all<{ Body: unknown }>(
      MCP_GATEWAY_ROUTE,
      { config: { cors: false } },
      async (request, reply) => handleMcpGatewayRequest({ request, reply, accessGate, dispatcher }),
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

const registerMcpGatewayRequestGate = (
  app: FastifyInstance,
  accessGate: McpGatewayAccessGate,
): void => {
  app.addHook("onRequest", async (request, reply) => {
    if (!isMcpGatewayUrl(request.url)) return;

    const origin = readSingleHeader(request.headers.origin);
    if (!isOriginAllowed(origin)) {
      await sendGatewayHttpError(reply, 403, "forbidden", "Forbidden");
      return;
    }
    if (request.method === "OPTIONS") {
      await handleGatewayOptions(request, reply);
      return;
    }
    const access = accessGate.validateRequest(request);
    if (!access.ok) {
      await sendGatewayHttpError(reply, access.statusCode, access.error, access.message);
      return;
    }
    if (!isSupportedGatewayRouteMethod(request.method)) {
      await sendGatewayMethodNotAllowed(reply);
    }
  });
};

const handleMcpGatewayRequest = async (input: {
  request: FastifyRequest<{ Body: unknown }>;
  reply: FastifyReply;
  accessGate: McpGatewayAccessGate;
  dispatcher: McpGatewayMethodDispatcher;
}) => {
  const { request, reply, accessGate, dispatcher } = input;
  const origin = readSingleHeader(request.headers.origin);
  if (!isOriginAllowed(origin)) {
    return sendGatewayHttpError(reply, 403, "forbidden", "Forbidden");
  }
  if (request.method === "OPTIONS") {
    return handleGatewayOptions(request, reply);
  }

  const access = accessGate.validateRequest(request);
  if (!access.ok) {
    return sendGatewayHttpError(reply, access.statusCode, access.error, access.message);
  }
  if (!isSupportedGatewayRouteMethod(request.method) || request.method === "DELETE") {
    return sendGatewayMethodNotAllowed(reply);
  }

  const protocolVersion = resolveProtocolVersion(readSingleHeader(request.headers["mcp-protocol-version"]));
  if (!protocolVersion.ok) {
    return sendJsonRpcRouteError(reply, 400, -32600, protocolVersion.message, null);
  }
  if (request.method === "GET") {
    if (!accepts(request, ["text/event-stream"])) {
      return sendGatewayHttpError(reply, 406, "not_acceptable", "Not Acceptable");
    }
    return sendGatewaySseCompatibilityResponse(reply);
  }
  if (!isGatewayJsonContentType(readSingleHeader(request.headers["content-type"]))) {
    return sendGatewayHttpError(reply, 415, "unsupported_media_type", "Unsupported Media Type");
  }
  if (!accepts(request, ["application/json", "text/event-stream"])) {
    return sendGatewayHttpError(reply, 406, "not_acceptable", "Not Acceptable");
  }

  const parseResult = parseJsonRpcBody(request.body);
  if (!parseResult.ok) {
    return sendJsonRpcRouteError(reply, 400, -32700, "Parse error", null);
  }

  const dispatchResult = await dispatcher.dispatch({
    payload: parseResult.payload,
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
  const mapper = getMcpGatewayResultMapper();
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

const isMcpGatewayUrl = (url: string): boolean => {
  const path = url.split("?")[0] ?? "";
  return path === MCP_GATEWAY_ROUTE || path.startsWith(`${MCP_GATEWAY_ROUTE}/`);
};

const sendGatewaySseCompatibilityResponse = (reply: FastifyReply) => reply
  .code(200)
  .header("cache-control", "no-cache")
  .header("connection", "keep-alive")
  .type("text/event-stream; charset=utf-8")
  .send(": autobyteus_mcp_gateway ready\n\n");
