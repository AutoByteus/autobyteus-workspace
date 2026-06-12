import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import {
  buildSendMessageToToolSpec,
} from "./codex-send-message-tool-spec-builder.js";
import type { AgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import { getSendMessageToDispatcher } from "../../../../agent-communication/services/send-message-to-dispatcher.js";

export const buildSendMessageToDynamicToolRegistrations = (input: {
  sender: AgentRunMessageSenderContext;
}): CodexDynamicToolRegistration[] => [
  {
    spec: buildSendMessageToToolSpec(),
    handler: async ({ toolName, arguments: toolArguments }) => {
      const result = await getSendMessageToDispatcher().dispatch({
        toolName,
        rawArguments: toolArguments,
        sender: input.sender,
      });
      return createCodexDynamicToolTextResult(
        result.message ?? (result.accepted ? "Delivered message." : `${toolName} failed.`),
        result.accepted,
      );
    },
  },
];
