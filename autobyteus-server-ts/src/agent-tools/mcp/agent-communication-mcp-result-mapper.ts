import {
  serializeAgentCommunicationToolResult,
  type AgentCommunicationToolResultEnvelope,
} from "../../agent-communication/services/agent-communication-tool-result.js";
import type { McpToolResult } from "./agent-tools-mcp-result-mapper.js";

export const toAgentCommunicationMcpToolResult = (
  envelope: AgentCommunicationToolResultEnvelope,
): McpToolResult => {
  const text = serializeAgentCommunicationToolResult(envelope);
  return {
    content: [{ type: "text", text }],
    structuredContent: JSON.parse(text) as AgentCommunicationToolResultEnvelope,
    ...(envelope.accepted ? {} : { isError: true }),
  };
};
