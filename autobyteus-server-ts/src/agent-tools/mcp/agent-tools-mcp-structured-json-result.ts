import type { McpToolResult } from "./agent-tools-mcp-result-mapper.js";

export const toAgentToolsMcpStructuredJsonResult = (
  serializedJson: string,
  options: { isError?: boolean } = {},
): McpToolResult => {
  const structuredContent = JSON.parse(serializedJson) as unknown;
  if (!isRecord(structuredContent)) {
    throw new Error("Agent Tools MCP structured JSON results must contain a JSON object.");
  }
  return {
    content: [{ type: "text", text: serializedJson }],
    structuredContent,
    ...(options.isError ? { isError: true } : {}),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
