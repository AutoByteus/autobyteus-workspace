import { AGENT_TOOLS_MCP_SERVER_NAME } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { agyRecord, agyString } from "./agy-stream-message.js";

/** AGY's native tool that carries every MCP call as `{ ServerName, ToolName, Arguments }`. */
export const AGY_MCP_CALL_TOOL_NAME = "call_mcp_tool";

export type AgyMcpToolCallProjection = { toolName: string; arguments: Record<string, unknown> };

/**
 * The platform-facing tool name and arguments of an AGY MCP call. Returns null when the step is
 * not an MCP call or its wrapper lacks a server or tool name; the caller then presents the step
 * as the provider reported it.
 */
export const projectAgyMcpToolCall = (
  providerToolName: string,
  parameters: Record<string, unknown> | null,
): AgyMcpToolCallProjection | null => {
  if (providerToolName !== AGY_MCP_CALL_TOOL_NAME) return null;
  const server = agyString(parameters?.ServerName);
  const tool = agyString(parameters?.ToolName);
  if (!server || !tool) return null;
  return {
    toolName: server === AGENT_TOOLS_MCP_SERVER_NAME ? tool : `mcp__${server}__${tool}`,
    arguments: agyRecord(parameters?.Arguments) ?? {},
  };
};

/** AGY delivers MCP output as flattened text; JSON object/array text is presented as structured JSON. */
export const projectAgyMcpToolOutput = (output: unknown): unknown => {
  if (typeof output !== "string") return output;
  try {
    const parsed: unknown = JSON.parse(output);
    return parsed !== null && typeof parsed === "object" ? parsed : output;
  } catch {
    return output;
  }
};
