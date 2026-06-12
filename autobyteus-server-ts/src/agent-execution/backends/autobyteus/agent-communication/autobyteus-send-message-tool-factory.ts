import type { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { AgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import { createBoundAutoByteusSendMessageToTool } from "../../../../agent-tools/agent-communication/send-message-to.js";

export const isSendMessageToToolName = (toolName: string | null | undefined): boolean =>
  toolName?.trim() === SEND_MESSAGE_TO_TOOL_NAME;

export const createAutoByteusSendMessageToToolForSender = (
  sender: AgentRunMessageSenderContext,
): BaseTool => createBoundAutoByteusSendMessageToTool(sender);
