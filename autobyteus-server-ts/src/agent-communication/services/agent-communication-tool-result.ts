import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

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

export const communicationRejection = <TResult extends object = object>(
  code: string,
  message: string,
): AgentCommunicationToolResultEnvelope<TResult> => ({
  accepted: false,
  code,
  message,
  result: null,
});
