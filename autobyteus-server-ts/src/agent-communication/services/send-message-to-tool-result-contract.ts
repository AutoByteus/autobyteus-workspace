import { z } from "zod";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

const NonBlankAgentRunIdSchema = z.string().trim().min(1);

const SendMessageToAcceptedResultSchema = z.strictObject({
  accepted: z.literal(true),
  code: z.string(),
  message: z.string(),
  target_agent_run_id: NonBlankAgentRunIdSchema,
});

const SendMessageToRejectedResultSchema = z.strictObject({
  accepted: z.literal(false),
  code: z.string(),
  message: z.string(),
  target_agent_run_id: z.null(),
});

export const SendMessageToResultSchema = z.discriminatedUnion("accepted", [
  SendMessageToAcceptedResultSchema,
  SendMessageToRejectedResultSchema,
]);

export type SendMessageToResult = z.infer<typeof SendMessageToResultSchema>;

export const toSendMessageToResult = (
  result: AgentOperationResult,
): SendMessageToResult => SendMessageToResultSchema.parse({
  accepted: result.accepted,
  code: result.code ?? (result.accepted ? "DELIVERED" : "SEND_MESSAGE_TO_FAILED"),
  message: result.message ?? (result.accepted ? "Message delivered." : "send_message_to failed."),
  target_agent_run_id: result.accepted ? result.agentRunId : null,
});

export const serializeSendMessageToResult = (
  result: SendMessageToResult,
): string => JSON.stringify(SendMessageToResultSchema.parse(result));

export const sendMessageToRejection = (
  code: string,
  message: string,
): SendMessageToResult => SendMessageToResultSchema.parse({
  accepted: false,
  code,
  message,
  target_agent_run_id: null,
});
