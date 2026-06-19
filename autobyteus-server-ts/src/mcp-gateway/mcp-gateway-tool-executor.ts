import type { McpContent, McpToolResult } from "./mcp-gateway-result-mapper.js";
import {
  McpGatewayToolCatalog,
  getMcpGatewayToolCatalog,
} from "./mcp-gateway-tool-catalog.js";

export const MCP_GATEWAY_EXECUTION_SCOPE_ID = "mcp-gateway/default";

export type ExecuteMcpGatewayToolCallInput = {
  toolName: string;
  rawArguments: Record<string, unknown>;
};

export class McpGatewayToolExecutor {
  private static instance: McpGatewayToolExecutor | null = null;
  private readonly catalog: McpGatewayToolCatalog;

  static getInstance(): McpGatewayToolExecutor {
    if (!McpGatewayToolExecutor.instance) {
      McpGatewayToolExecutor.instance = new McpGatewayToolExecutor();
    }
    return McpGatewayToolExecutor.instance;
  }

  static resetInstance(): void {
    McpGatewayToolExecutor.instance = null;
  }

  constructor(deps: { catalog?: McpGatewayToolCatalog } = {}) {
    this.catalog = deps.catalog ?? getMcpGatewayToolCatalog();
  }

  async executeMcpGatewayToolCall(input: ExecuteMcpGatewayToolCallInput): Promise<McpToolResult> {
    const tool = this.catalog.createCurrentMcpTool(input.toolName);
    if (!tool) {
      throw new Error(`MCP gateway tool '${input.toolName}' is not available.`);
    }
    const result = await tool.execute(
      { agentId: MCP_GATEWAY_EXECUTION_SCOPE_ID },
      input.rawArguments,
    );
    return normalizeMcpToolResult(result);
  }
}

export const getMcpGatewayToolExecutor = (): McpGatewayToolExecutor =>
  McpGatewayToolExecutor.getInstance();

export const resetMcpGatewayToolExecutorForTests = (): void => {
  McpGatewayToolExecutor.resetInstance();
};

const normalizeMcpToolResult = (value: unknown): McpToolResult => {
  if (isRecord(value) && Array.isArray(value.content)) {
    const content = normalizeContent(value.content);
    const result: McpToolResult = {
      content: content.length > 0 ? content : [buildTextContent(serializeUnknown(value))],
    };
    if (value.isError === true) {
      result.isError = true;
    }
    if ("structuredContent" in value) {
      result.structuredContent = structuredCloneSafe(value.structuredContent);
    }
    if (isRecord(value._meta)) {
      result._meta = structuredCloneSafe(value._meta) as Record<string, unknown>;
    }
    return result;
  }
  return { content: [buildTextContent(serializeUnknown(value))] };
};

const normalizeContent = (content: unknown[]): McpContent[] => content
  .map((item) => {
    if (!isRecord(item) || typeof item.type !== "string" || !item.type.trim()) {
      return null;
    }
    return structuredCloneSafe(item) as McpContent;
  })
  .filter((item): item is McpContent => Boolean(item));

const buildTextContent = (text: string): McpContent => ({ type: "text", text });

const serializeUnknown = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
};

const structuredCloneSafe = (value: unknown): unknown => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
