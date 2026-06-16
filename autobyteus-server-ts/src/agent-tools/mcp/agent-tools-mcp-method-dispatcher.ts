import type { AgentToolMcpSession } from "./agent-tool-mcp-session.js";
import {
  AgentToolMcpCatalog,
  getAgentToolMcpCatalog,
} from "./agent-tool-mcp-catalog.js";
import {
  AgentToolMcpToolExecutor,
  getAgentToolMcpToolExecutor,
} from "./agent-tool-mcp-tool-executor.js";
import { AGENT_TOOLS_MCP_SERVER_NAME } from "./agent-tool-mcp-session.js";
import {
  AgentToolsMcpResultMapper,
  getAgentToolsMcpResultMapper,
  type JsonRpcId,
  type JsonRpcResponse,
} from "./agent-tools-mcp-result-mapper.js";

export type AgentToolsMcpDispatchResult =
  | { kind: "json"; statusCode: number; body: JsonRpcResponse }
  | { kind: "empty"; statusCode: 202 };

export type AgentToolsMcpMethodDispatchInput = {
  payload: unknown;
  session: AgentToolMcpSession;
  protocolVersion: string;
};

type JsonRpcObject = Record<string, unknown>;

const JSON_RPC_VERSION = "2.0";

export class AgentToolsMcpMethodDispatcher {
  private static instance: AgentToolsMcpMethodDispatcher | null = null;
  private readonly catalog: AgentToolMcpCatalog;
  private readonly toolExecutor: AgentToolMcpToolExecutor;
  private readonly resultMapper: AgentToolsMcpResultMapper;

  static getInstance(): AgentToolsMcpMethodDispatcher {
    if (!AgentToolsMcpMethodDispatcher.instance) {
      AgentToolsMcpMethodDispatcher.instance = new AgentToolsMcpMethodDispatcher();
    }
    return AgentToolsMcpMethodDispatcher.instance;
  }

  static resetInstance(): void {
    AgentToolsMcpMethodDispatcher.instance = null;
  }

  constructor(deps: {
    catalog?: AgentToolMcpCatalog;
    toolExecutor?: AgentToolMcpToolExecutor;
    resultMapper?: AgentToolsMcpResultMapper;
  } = {}) {
    this.catalog = deps.catalog ?? getAgentToolMcpCatalog();
    this.toolExecutor = deps.toolExecutor ?? getAgentToolMcpToolExecutor();
    this.resultMapper = deps.resultMapper ?? getAgentToolsMcpResultMapper();
  }

  async dispatch(input: AgentToolsMcpMethodDispatchInput): Promise<AgentToolsMcpDispatchResult> {
    const envelope = this.validateEnvelope(input.payload);
    if (!envelope.ok) {
      return this.json(400, this.resultMapper.jsonRpcError(envelope.id, -32600, "Invalid Request"));
    }
    if (envelope.kind === "notification" || envelope.kind === "client_response") {
      return { kind: "empty", statusCode: 202 };
    }

    const { id, request } = envelope;
    switch (request.method) {
      case "initialize":
        return this.dispatchInitialize(id, request, input.protocolVersion);
      case "tools/list":
        return this.dispatchToolsList(id, request, input.session);
      case "tools/call":
        return this.dispatchToolsCall(id, request, input.session);
      case "resources/list":
        return this.dispatchEmptyResources(id, request);
      case "resources/templates/list":
        return this.dispatchEmptyResourceTemplates(id, request);
      case "ping":
        return this.dispatchPing(id, request);
      default:
        return this.json(200, this.resultMapper.jsonRpcError(id, -32601, "Method not found"));
    }
  }

  private dispatchInitialize(id: JsonRpcId, request: JsonRpcObject, protocolVersion: string): AgentToolsMcpDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "initialize params must be an object when provided.");
    }
    return this.json(200, this.resultMapper.jsonRpcSuccess(id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false }, resources: {} },
      serverInfo: { name: AGENT_TOOLS_MCP_SERVER_NAME, version: "0.1.0" },
    }));
  }

  private dispatchToolsList(id: JsonRpcId, request: JsonRpcObject, session: AgentToolMcpSession): AgentToolsMcpDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "tools/list params must be an object when provided.");
    }
    try {
      return this.json(200, this.resultMapper.jsonRpcSuccess(id, { tools: this.catalog.listMcpToolsForSession(session) }));
    } catch {
      return this.internalError(id);
    }
  }

  private async dispatchToolsCall(
    id: JsonRpcId,
    request: JsonRpcObject,
    session: AgentToolMcpSession,
  ): Promise<AgentToolsMcpDispatchResult> {
    const params = request.params;
    if (!isRecord(params)) {
      return this.invalidParams(id, "tools/call params must be an object.");
    }
    const toolName = typeof params.name === "string" ? params.name : "";
    if (!toolName.trim()) {
      return this.invalidParams(id, "tools/call requires a non-empty tool name.");
    }
    const rawArguments = params.arguments === undefined ? {} : isRecord(params.arguments) ? params.arguments : null;
    if (rawArguments === null) {
      return this.invalidParams(id, "tools/call arguments must be an object when provided.");
    }

    const availability = this.catalog.resolveToolCallAvailability(session, toolName);
    if (!availability.ok) {
      const message = availability.reason === "unknown_tool"
        ? "Unknown MCP tool"
        : "Tool is not enabled for this session";
      return this.invalidParams(id, message);
    }

    try {
      const executionResult = await this.toolExecutor.executeAgentToolMcpCall({ session, toolName, rawArguments });
      return this.json(200, this.resultMapper.jsonRpcSuccess(
        id,
        this.resultMapper.toolResultFromExecutionResult(toolName, executionResult),
      ));
    } catch {
      return this.internalError(id);
    }
  }

  private dispatchEmptyResources(id: JsonRpcId, request: JsonRpcObject): AgentToolsMcpDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "resources/list params must be an object when provided.");
    }
    return this.json(200, this.resultMapper.jsonRpcSuccess(id, { resources: [] }));
  }

  private dispatchEmptyResourceTemplates(id: JsonRpcId, request: JsonRpcObject): AgentToolsMcpDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "resources/templates/list params must be an object when provided.");
    }
    return this.json(200, this.resultMapper.jsonRpcSuccess(id, { resourceTemplates: [] }));
  }

  private dispatchPing(id: JsonRpcId, request: JsonRpcObject): AgentToolsMcpDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "ping params must be an object when provided.");
    }
    return this.json(200, this.resultMapper.jsonRpcSuccess(id, {}));
  }

  private validateEnvelope(payload: unknown):
    | { ok: true; kind: "request"; id: JsonRpcId; request: JsonRpcObject }
    | { ok: true; kind: "notification" }
    | { ok: true; kind: "client_response" }
    | { ok: false; id: JsonRpcId } {
    if (!isRecord(payload)) {
      return { ok: false, id: null };
    }
    const id = readSafeId(payload);
    if (payload.jsonrpc !== JSON_RPC_VERSION) {
      return { ok: false, id };
    }
    if (typeof payload.method === "string" && payload.method.length > 0) {
      return hasOwn(payload, "id")
        ? { ok: true, kind: "request", id, request: payload }
        : { ok: true, kind: "notification" };
    }
    if (!hasOwn(payload, "method") && hasOwn(payload, "id") && (hasOwn(payload, "result") || hasOwn(payload, "error"))) {
      return { ok: true, kind: "client_response" };
    }
    return { ok: false, id };
  }

  private invalidParams(id: JsonRpcId, message: string): AgentToolsMcpDispatchResult {
    return this.json(200, this.resultMapper.jsonRpcError(id, -32602, message));
  }

  private internalError(id: JsonRpcId): AgentToolsMcpDispatchResult {
    return this.json(200, this.resultMapper.jsonRpcError(id, -32603, "Internal error"));
  }

  private json(statusCode: number, body: JsonRpcResponse): AgentToolsMcpDispatchResult {
    return { kind: "json", statusCode, body };
  }
}

export const getAgentToolsMcpMethodDispatcher = (): AgentToolsMcpMethodDispatcher =>
  AgentToolsMcpMethodDispatcher.getInstance();

export const resetAgentToolsMcpMethodDispatcherForTests = (): void => {
  AgentToolsMcpMethodDispatcher.resetInstance();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const readSafeId = (value: Record<string, unknown>): JsonRpcId => {
  if (!hasOwn(value, "id")) {
    return null;
  }
  const id = value.id;
  return typeof id === "string" || typeof id === "number" || id === null ? id : null;
};

const areParamsObjectLike = (params: unknown): boolean =>
  params === undefined || params === null || isRecord(params);
