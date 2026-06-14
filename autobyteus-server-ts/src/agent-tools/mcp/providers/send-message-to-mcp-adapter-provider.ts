import {
  getSendMessageToDispatcher,
  type SendMessageToDispatcher,
} from "../../../agent-communication/services/send-message-to-dispatcher.js";
import {
  SEND_MESSAGE_TO_TOOL_DESCRIPTION,
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../../agent-communication/services/send-message-to-tool-contract.js";
import { buildSendMessageToParameterSchema } from "../../agent-communication/send-message-to-parameter-schema.js";
import type {
  AgentToolMcpAdapterProvider,
  AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";

export class SendMessageToMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  constructor(
    private readonly sendMessageDispatcher: SendMessageToDispatcher = getSendMessageToDispatcher(),
  ) {}

  getAdapters(): AgentToolMcpToolAdapter[] {
    return [
      {
        definition: {
          name: SEND_MESSAGE_TO_TOOL_NAME,
          description: SEND_MESSAGE_TO_TOOL_DESCRIPTION,
          inputSchema: buildSendMessageToParameterSchema(),
        },
        isAvailable: () => true,
        execute: ({ session, rawArguments }) =>
          this.sendMessageDispatcher.dispatch({
            toolName: SEND_MESSAGE_TO_TOOL_NAME,
            rawArguments,
            sender: session.sender,
          }),
      },
    ];
  }
}
