import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

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

export type McpTextContent = {
  type: "text";
  text: string;
};

export type McpToolResult = {
  content: McpTextContent[];
  isError?: true;
};

export class AgentToolsMcpResultMapper {
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
      error: {
        code,
        message,
      },
    };
  }

  toolResultFromOperationResult(
    toolName: string,
    result: AgentOperationResult,
  ): McpToolResult {
    const text = result.message ?? (result.accepted ? "Tool completed." : `${toolName} failed.`);
    const toolResult: McpToolResult = {
      content: [{ type: "text", text }],
    };
    if (!result.accepted) {
      toolResult.isError = true;
    }
    return toolResult;
  }
}

export const getAgentToolsMcpResultMapper = (): AgentToolsMcpResultMapper =>
  new AgentToolsMcpResultMapper();
