import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { McpToolResult } from "../../agent-tools/mcp/agent-tools-mcp-result-mapper.js";

export type AgentCommunicationToolResultEnvelope<TResult extends object = object> = {
  accepted: boolean;
  code: string;
  message: string;
  result: TResult | null;
};

export const toAgentCommunicationToolResult = (
  result: AgentOperationResult,
): AgentCommunicationToolResultEnvelope => ({
  accepted: result.accepted,
  code: result.code ?? (result.accepted ? "DELIVERED" : "SEND_MESSAGE_TO_FAILED"),
  message: result.message ?? (result.accepted ? "Message delivered." : "send_message_to failed."),
  result: null,
});

export const serializeAgentCommunicationToolResult = (
  envelope: AgentCommunicationToolResultEnvelope,
): string => JSON.stringify(envelope);

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

export const communicationRejection = <TResult extends object = object>(
  code: string,
  message: string,
): AgentCommunicationToolResultEnvelope<TResult> => ({
  accepted: false,
  code,
  message,
  result: null,
});
