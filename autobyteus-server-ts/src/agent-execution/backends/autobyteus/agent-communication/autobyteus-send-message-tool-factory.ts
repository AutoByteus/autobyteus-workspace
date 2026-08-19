import type { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { AgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import { createBoundAutoByteusSendMessageToTool } from "../../../../agent-tools/agent-communication/send-message-to.js";
import { GET_HANDOFF_RULES_TOOL_NAME } from "../../../../agent-communication/services/get-handoff-rules-tool-contract.js";
import { createBoundAutoByteusGetHandoffRulesTool } from "../../../../agent-tools/agent-communication/get-handoff-rules.js";

export const isSendMessageToToolName = (toolName: string | null | undefined): boolean =>
  toolName?.trim() === SEND_MESSAGE_TO_TOOL_NAME;

export const createAutoByteusSendMessageToToolForSender = (
  sender: AgentRunMessageSenderContext,
): BaseTool => createBoundAutoByteusSendMessageToTool(sender);

export const isGetHandoffRulesToolName = (toolName: string | null | undefined): boolean =>
  toolName?.trim() === GET_HANDOFF_RULES_TOOL_NAME;

export const createAutoByteusGetHandoffRulesToolForSender = (
  sender: AgentRunMessageSenderContext,
): BaseTool => {
  if (!sender.memberTeamContext) {
    throw new Error("get_handoff_rules requires a Team-bound Agent sender.");
  }
  return createBoundAutoByteusGetHandoffRulesTool(sender.memberTeamContext);
};
