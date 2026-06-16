import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentToolMcpExecutionResult } from "./agent-tool-mcp-adapter.js";

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

export type McpContent = Record<string, unknown> & { type: string };

export type McpToolResult = {
  content: McpContent[];
  isError?: boolean;
  structuredContent?: unknown;
  _meta?: Record<string, unknown>;
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

  toolResultFromExecutionResult(
    toolName: string,
    result: AgentToolMcpExecutionResult,
  ): McpToolResult {
    if (result.kind === "mcp_tool_result") {
      return cloneMcpToolResult(result.result);
    }
    return this.toolResultFromOperationResult(toolName, result.result);
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

const cloneMcpToolResult = (result: McpToolResult): McpToolResult => {
  const clone: McpToolResult = {
    content: result.content.map((item) => structuredCloneSafe(item) as McpContent),
  };
  if (result.isError === true) {
    clone.isError = true;
  }
  if ("structuredContent" in result) {
    clone.structuredContent = structuredCloneSafe(result.structuredContent);
  }
  if (result._meta) {
    clone._meta = structuredCloneSafe(result._meta) as Record<string, unknown>;
  }
  return clone;
};

const structuredCloneSafe = (value: unknown): unknown => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
};
