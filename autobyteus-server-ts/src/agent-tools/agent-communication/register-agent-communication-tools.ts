import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../agent-communication/services/send-message-to-tool-contract.js";
import { ensureAutoByteusSendMessageToToolRegistered } from "./send-message-to.js";

export function registerAgentCommunicationTools(): void {
  ensureAutoByteusSendMessageToToolRegistered();
}

export function unregisterAgentCommunicationTools(): void {
  defaultToolRegistry.unregisterTool(SEND_MESSAGE_TO_TOOL_NAME);
}
