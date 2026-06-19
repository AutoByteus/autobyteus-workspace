import {
  McpGatewayResultMapper,
  getMcpGatewayResultMapper,
  type JsonRpcId,
  type JsonRpcResponse,
} from "./mcp-gateway-result-mapper.js";
import {
  McpGatewayToolCatalog,
  getMcpGatewayToolCatalog,
} from "./mcp-gateway-tool-catalog.js";
import {
  McpGatewayToolExecutor,
  getMcpGatewayToolExecutor,
} from "./mcp-gateway-tool-executor.js";

export const MCP_GATEWAY_SERVER_NAME = "autobyteus_mcp_gateway";

export type McpGatewayDispatchResult =
  | { kind: "json"; statusCode: number; body: JsonRpcResponse }
  | { kind: "empty"; statusCode: 202 };

export type McpGatewayMethodDispatchInput = {
  payload: unknown;
  protocolVersion: string;
};

type JsonRpcObject = Record<string, unknown>;

const JSON_RPC_VERSION = "2.0";

export class McpGatewayMethodDispatcher {
  private static instance: McpGatewayMethodDispatcher | null = null;
  private readonly catalog: McpGatewayToolCatalog;
  private readonly toolExecutor: McpGatewayToolExecutor;
  private readonly resultMapper: McpGatewayResultMapper;

  static getInstance(): McpGatewayMethodDispatcher {
    if (!McpGatewayMethodDispatcher.instance) {
      McpGatewayMethodDispatcher.instance = new McpGatewayMethodDispatcher();
    }
    return McpGatewayMethodDispatcher.instance;
  }

  static resetInstance(): void {
    McpGatewayMethodDispatcher.instance = null;
  }

  constructor(deps: {
    catalog?: McpGatewayToolCatalog;
    toolExecutor?: McpGatewayToolExecutor;
    resultMapper?: McpGatewayResultMapper;
  } = {}) {
    this.catalog = deps.catalog ?? getMcpGatewayToolCatalog();
    this.toolExecutor = deps.toolExecutor ?? getMcpGatewayToolExecutor();
    this.resultMapper = deps.resultMapper ?? getMcpGatewayResultMapper();
  }

  async dispatch(input: McpGatewayMethodDispatchInput): Promise<McpGatewayDispatchResult> {
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
        return this.dispatchToolsList(id, request);
      case "tools/call":
        return this.dispatchToolsCall(id, request);
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

  private dispatchInitialize(id: JsonRpcId, request: JsonRpcObject, protocolVersion: string): McpGatewayDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "initialize params must be an object when provided.");
    }
    return this.json(200, this.resultMapper.jsonRpcSuccess(id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false }, resources: {} },
      serverInfo: { name: MCP_GATEWAY_SERVER_NAME, version: "0.1.0" },
    }));
  }

  private dispatchToolsList(id: JsonRpcId, request: JsonRpcObject): McpGatewayDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "tools/list params must be an object when provided.");
    }
    try {
      return this.json(200, this.resultMapper.jsonRpcSuccess(id, { tools: this.catalog.listMcpGatewayTools() }));
    } catch {
      return this.internalError(id);
    }
  }

  private async dispatchToolsCall(id: JsonRpcId, request: JsonRpcObject): Promise<McpGatewayDispatchResult> {
    const params = request.params;
    if (!isRecord(params)) {
      return this.invalidParams(id, "tools/call params must be an object.");
    }
    const toolName = typeof params.name === "string" ? params.name.trim() : "";
    if (!toolName) {
      return this.invalidParams(id, "tools/call requires a non-empty tool name.");
    }
    const rawArguments = params.arguments === undefined ? {} : isRecord(params.arguments) ? params.arguments : null;
    if (rawArguments === null) {
      return this.invalidParams(id, "tools/call arguments must be an object when provided.");
    }
    if (!this.catalog.resolveMcpOriginTool(toolName).ok) {
      return this.invalidParams(id, "Unknown MCP tool");
    }

    try {
      const result = await this.toolExecutor.executeMcpGatewayToolCall({ toolName, rawArguments });
      return this.json(200, this.resultMapper.jsonRpcSuccess(id, result));
    } catch {
      return this.internalError(id);
    }
  }

  private dispatchEmptyResources(id: JsonRpcId, request: JsonRpcObject): McpGatewayDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "resources/list params must be an object when provided.");
    }
    return this.json(200, this.resultMapper.jsonRpcSuccess(id, { resources: [] }));
  }

  private dispatchEmptyResourceTemplates(id: JsonRpcId, request: JsonRpcObject): McpGatewayDispatchResult {
    if (!areParamsObjectLike(request.params)) {
      return this.invalidParams(id, "resources/templates/list params must be an object when provided.");
    }
    return this.json(200, this.resultMapper.jsonRpcSuccess(id, { resourceTemplates: [] }));
  }

  private dispatchPing(id: JsonRpcId, request: JsonRpcObject): McpGatewayDispatchResult {
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

  private invalidParams(id: JsonRpcId, message: string): McpGatewayDispatchResult {
    return this.json(200, this.resultMapper.jsonRpcError(id, -32602, message));
  }

  private internalError(id: JsonRpcId): McpGatewayDispatchResult {
    return this.json(200, this.resultMapper.jsonRpcError(id, -32603, "Internal error"));
  }

  private json(statusCode: number, body: JsonRpcResponse): McpGatewayDispatchResult {
    return { kind: "json", statusCode, body };
  }
}

export const getMcpGatewayMethodDispatcher = (): McpGatewayMethodDispatcher =>
  McpGatewayMethodDispatcher.getInstance();

export const resetMcpGatewayMethodDispatcherForTests = (): void => {
  McpGatewayMethodDispatcher.resetInstance();
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
