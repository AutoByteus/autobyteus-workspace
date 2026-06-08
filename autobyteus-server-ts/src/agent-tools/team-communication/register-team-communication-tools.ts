import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../agent-team-execution/services/send-message-to-tool-contract.js";
import { ensureAutoByteusSendMessageToToolRegistered } from "./send-message-to.js";

export function registerTeamCommunicationTools(): void {
  ensureAutoByteusSendMessageToToolRegistered();
}

export function unregisterTeamCommunicationTools(): void {
  defaultToolRegistry.unregisterTool(SEND_MESSAGE_TO_TOOL_NAME);
}
