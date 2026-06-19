export type JsonRpcId = string | number | null;

export type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602 | -32603;

export type JsonRpcSuccessResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
};

export type JsonRpcErrorResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: JsonRpcErrorCode;
    message: string;
  };
};

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export type McpContent = Record<string, unknown> & { type: string };

export type McpToolResult = {
  content: McpContent[];
  isError?: boolean;
  structuredContent?: unknown;
  _meta?: Record<string, unknown>;
};

export class McpGatewayResultMapper {
  jsonRpcSuccess(id: JsonRpcId, result: unknown): JsonRpcSuccessResponse {
    return { jsonrpc: "2.0", id, result };
  }

  jsonRpcError(
    id: JsonRpcId,
    code: JsonRpcErrorCode,
    message: string,
  ): JsonRpcErrorResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: { code, message },
    };
  }
}

export const getMcpGatewayResultMapper = (): McpGatewayResultMapper =>
  new McpGatewayResultMapper();
