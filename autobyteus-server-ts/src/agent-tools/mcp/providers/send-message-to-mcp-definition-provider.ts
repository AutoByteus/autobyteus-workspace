import {
  SEND_MESSAGE_TO_TOOL_DESCRIPTION,
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../../agent-communication/services/send-message-to-tool-contract.js";
import { buildSendMessageToParameterSchema } from "../../agent-communication/send-message-to-parameter-schema.js";
import type {
  AgentToolMcpDefinitionProvider,
  AgentToolMcpSupportedToolDefinition,
} from "../agent-tool-mcp-definition-provider.js";

export class SendMessageToMcpDefinitionProvider implements AgentToolMcpDefinitionProvider {
  getDefinition(): AgentToolMcpSupportedToolDefinition {
    return {
      name: SEND_MESSAGE_TO_TOOL_NAME,
      description: SEND_MESSAGE_TO_TOOL_DESCRIPTION,
      inputSchema: buildSendMessageToParameterSchema(),
    };
  }
}
