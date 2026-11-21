import { z } from "zod";
import { toToolResultJson } from "autobyteus-ts/tools/tool-result-json.js";
import { MESSAGE_DELIVERED_TEXT, type AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

const NonBlankAgentRunIdSchema = z.string().trim().min(1);

const SendMessageToAcceptedResultSchema = z.strictObject({
  accepted: z.literal(true),
  code: z.string(),
  message: z.string(),
  target_agent_run_id: NonBlankAgentRunIdSchema,
  /** autobyteus-587 RF-6: how many reference files were copied to the receiving node, when any. */
  files_sent: z.number().int().positive().optional(),
});

const SendMessageToRejectedResultSchema = z.strictObject({
  accepted: z.literal(false),
  code: z.string(),
  message: z.string(),
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
  message: result.message ?? (result.accepted ? MESSAGE_DELIVERED_TEXT : "send_message_to failed."),
  ...(result.accepted ? { target_agent_run_id: result.agentRunId, ...(result.filesSent ? { files_sent: result.filesSent } : {}) } : {}),
});

export const serializeSendMessageToResult = (
  result: SendMessageToResult,
): string => toToolResultJson(SendMessageToResultSchema.parse(result));

export const sendMessageToRejection = (
  code: string,
  message: string,
): SendMessageToResult => SendMessageToResultSchema.parse({
  accepted: false,
  code,
  message,
});
