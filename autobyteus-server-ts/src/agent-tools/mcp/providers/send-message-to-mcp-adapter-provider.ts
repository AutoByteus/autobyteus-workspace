import {
  getSendMessageToDispatcher,
  type SendMessageToDispatcher,
} from "../../../agent-communication/services/send-message-to-dispatcher.js";
import {
  SEND_MESSAGE_TO_TOOL_DESCRIPTION,
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../../agent-communication/services/send-message-to-tool-contract.js";
import { buildSendMessageToParameterSchema } from "../../agent-communication/send-message-to-parameter-schema.js";
import {
  toAgentToolMcpToolResult,
  type AgentToolMcpAdapterProvider,
  type AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";
import {
  SendMessageToResultSchema,
  serializeSendMessageToResult,
  toSendMessageToResult,
} from "../../../agent-communication/services/send-message-to-tool-result-contract.js";
import { toAgentToolsMcpStructuredJsonResult } from "../agent-tools-mcp-structured-json-result.js";

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
          outputSchema: SendMessageToResultSchema,
        },
        configuredMcpCollisionPolicy: "protect_static_adapter",
        isAvailable: () => true,
        execute: async ({ session, rawArguments }) => {
          const result = toSendMessageToResult(
            await this.sendMessageDispatcher.dispatch({
              toolName: SEND_MESSAGE_TO_TOOL_NAME,
              rawArguments,
              sender: session.sender,
            }),
          );
          return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(
            serializeSendMessageToResult(result),
            { isError: !result.accepted },
          ));
        },
      },
    ];
  }
}
