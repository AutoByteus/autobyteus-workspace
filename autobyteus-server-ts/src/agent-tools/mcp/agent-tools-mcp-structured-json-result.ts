import { toToolResultJson } from "autobyteus-ts/tools/tool-result-json.js";
import type { McpToolResult } from "./agent-tools-mcp-result-mapper.js";

/**
 * A platform tool's structured MCP result: the text copy and `structuredContent` both come from one value,
 * after the tool result rule (no empty fields, compact JSON).
 */
export const toAgentToolsMcpStructuredJsonResult = (
  value: object,
  options: { isError?: boolean } = {},
): McpToolResult => {
  const text = toToolResultJson(value);
  const structured = JSON.parse(text) as unknown;
  if (!isRecord(structured)) {
    throw new Error("Agent Tools MCP structured JSON results must contain a JSON object.");
  }
  return {
    content: [{ type: "text", text }],
    structuredContent: structured,
    ...(options.isError ? { isError: true } : {}),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
