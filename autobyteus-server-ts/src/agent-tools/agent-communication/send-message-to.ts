import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import {
  getSendMessageToDispatcher,
  type SendMessageToDispatcher,
} from "../../agent-communication/services/send-message-to-dispatcher.js";
import {
  SEND_MESSAGE_TO_TOOL_DESCRIPTION,
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../agent-communication/services/send-message-to-tool-contract.js";
import { buildSendMessageToParameterSchema } from "./send-message-to-parameter-schema.js";
import {
  communicationRejection,
  serializeAgentCommunicationToolResult,
  toAgentCommunicationToolResult,
} from "../../agent-communication/services/agent-communication-tool-result.js";

const SERVER_OWNED_AGENT_COMMUNICATION_TOOL = "server-owned-agent-communication";

export class AutoByteusSendMessageToTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.AGENT_COMMUNICATION;

  private readonly sender: AgentRunMessageSenderContext | null;
  private readonly dispatcher: SendMessageToDispatcher;

  constructor(
    config?: ToolConfig,
    options: {
      sender?: AgentRunMessageSenderContext | null;
      dispatcher?: SendMessageToDispatcher | null;
    } = {},
  ) {
    super(config);
    this.sender = options.sender ?? null;
    this.dispatcher = options.dispatcher ?? getSendMessageToDispatcher();
  }

  static getName(): string {
    return SEND_MESSAGE_TO_TOOL_NAME;
  }

  static getDescription(): string {
    return SEND_MESSAGE_TO_TOOL_DESCRIPTION;
  }

  static getArgumentSchema() {
    return buildSendMessageToParameterSchema();
  }

  protected async _execute(
    _context: unknown,
    kwargs: Record<string, unknown> = {},
  ): Promise<string> {
    if (!this.sender) {
      return serializeAgentCommunicationToolResult(communicationRejection(
        "AGENT_COMMUNICATION_SENDER_CONTEXT_REQUIRED",
        "send_message_to requires an active Agent sender context.",
      ));
    }

    const result = await this.dispatcher.dispatch({
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      rawArguments: kwargs,
      sender: this.sender,
    });
    return serializeAgentCommunicationToolResult(toAgentCommunicationToolResult(result));
  }
}

const createAutoByteusSendMessageToToolDefinition = (): ToolDefinition =>
  new ToolDefinition(
    SEND_MESSAGE_TO_TOOL_NAME,
    SEND_MESSAGE_TO_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.AGENT_COMMUNICATION,
    () => buildSendMessageToParameterSchema(),
    () => null,
    {
      toolClass: AutoByteusSendMessageToTool,
      metadata: { owner: SERVER_OWNED_AGENT_COMMUNICATION_TOOL },
    },
  );

export const ensureAutoByteusSendMessageToToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(SEND_MESSAGE_TO_TOOL_NAME);
  if (existing?.metadata?.owner === SERVER_OWNED_AGENT_COMMUNICATION_TOOL) {
    return existing;
  }

  const definition = createAutoByteusSendMessageToToolDefinition();
  defaultToolRegistry.registerTool(definition);
  return definition;
};

export const createBoundAutoByteusSendMessageToTool = (
  sender: AgentRunMessageSenderContext,
  dispatcher: SendMessageToDispatcher | null = null,
): AutoByteusSendMessageToTool => {
  const definition = ensureAutoByteusSendMessageToToolRegistered();
  const tool = new AutoByteusSendMessageToTool(undefined, { sender, dispatcher });
  tool.definition = definition;
  return tool;
};
