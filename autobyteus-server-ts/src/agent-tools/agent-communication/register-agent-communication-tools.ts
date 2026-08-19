import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../agent-communication/services/send-message-to-tool-contract.js";
import { ensureAutoByteusSendMessageToToolRegistered } from "./send-message-to.js";
import { GET_HANDOFF_RULES_TOOL_NAME } from "../../agent-communication/services/get-handoff-rules-tool-contract.js";
import { ensureAutoByteusGetHandoffRulesToolRegistered } from "./get-handoff-rules.js";

export function registerAgentCommunicationTools(): void {
  ensureAutoByteusSendMessageToToolRegistered();
  ensureAutoByteusGetHandoffRulesToolRegistered();
}

export function unregisterAgentCommunicationTools(): void {
  defaultToolRegistry.unregisterTool(SEND_MESSAGE_TO_TOOL_NAME);
  defaultToolRegistry.unregisterTool(GET_HANDOFF_RULES_TOOL_NAME);
}
