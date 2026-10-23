import { isAgentDiscoveryRefusal } from "../../agent-discovery/agent-discovery-refusal.js";
import { toAgentToolMcpToolResult, type AgentToolMcpMcpToolExecutionResult } from "../agent-tool-mcp-adapter.js";

/**
 * A discovery tool's outcome over Agent Tools MCP (autobyteus-261): the result as structured content, or the
 * refusal's text as an error result (a thrown error would reach the agent only as an internal error).
 */
export const toAgentDiscoveryMcpResult = (outcome: object): AgentToolMcpMcpToolExecutionResult =>
  isAgentDiscoveryRefusal(outcome)
    ? toAgentToolMcpToolResult({ content: [{ type: "text", text: outcome.message }], isError: true })
    : toAgentToolMcpToolResult({ content: [{ type: "text", text: JSON.stringify(outcome) }], structuredContent: outcome as Record<string, unknown> });
