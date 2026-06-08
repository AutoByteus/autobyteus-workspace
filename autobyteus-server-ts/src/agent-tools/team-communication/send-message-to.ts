import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";
import {
  buildInterAgentMessageDeliveryIntent,
} from "../../agent-team-execution/services/inter-agent-message-delivery-intent-builder.js";
import { describeTeamMessageTargetSelector } from "../../agent-team-execution/domain/team-message-target-selector.js";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "../../agent-team-execution/services/send-message-to-tool-argument-parser.js";
import {
  SEND_MESSAGE_TO_TOOL_DESCRIPTION,
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../agent-team-execution/services/send-message-to-tool-contract.js";
import { buildSendMessageToParameterSchema } from "./send-message-to-parameter-schema.js";

const SERVER_OWNED_TEAM_COMMUNICATION_TOOL = "server-owned-team-communication";

export class AutoByteusSendMessageToTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.AGENT_COMMUNICATION;

  private readonly memberTeamContext: MemberTeamContext | null;

  constructor(
    config?: ToolConfig,
    options: { memberTeamContext?: MemberTeamContext | null } = {},
  ) {
    super(config);
    this.memberTeamContext = options.memberTeamContext ?? null;
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
    const parsed = parseSendMessageToToolArguments(kwargs);
    const validationError = validateParsedSendMessageToToolArguments(
      SEND_MESSAGE_TO_TOOL_NAME,
      parsed,
    );
    if (validationError) {
      return `Error: ${validationError.message}`;
    }

    const memberTeamContext = this.memberTeamContext;
    if (!memberTeamContext?.sendMessageToEnabled || !memberTeamContext.deliverInterAgentMessage) {
      return "Error: send_message_to delivery handler is unavailable for this AutoByteus team member.";
    }
    if (!parsed.target || !parsed.content) {
      return "Error: send_message_to requires exactly one target selector and non-empty content.";
    }

    const targetDescription = describeTeamMessageTargetSelector(parsed.target);
    const intentResult = buildInterAgentMessageDeliveryIntent({
      memberTeamContext,
      target: parsed.target,
      content: parsed.content.trim(),
      messageType: parsed.messageType,
      referenceFiles: parsed.referenceFiles,
    });
    if (!intentResult.ok) {
      return `Error: ${intentResult.message}`;
    }

    const result = await memberTeamContext.deliverInterAgentMessage(intentResult.intent);
    if (!result.accepted) {
      return `Error: ${result.message ?? "Failed delivering message to teammate."}`;
    }

    return `Delivered message to ${targetDescription}.`;
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
      metadata: { owner: SERVER_OWNED_TEAM_COMMUNICATION_TOOL },
    },
  );

export const ensureAutoByteusSendMessageToToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(SEND_MESSAGE_TO_TOOL_NAME);
  if (existing?.metadata?.owner === SERVER_OWNED_TEAM_COMMUNICATION_TOOL) {
    return existing;
  }

  const definition = createAutoByteusSendMessageToToolDefinition();
  defaultToolRegistry.registerTool(definition);
  return definition;
};

export const createBoundAutoByteusSendMessageToTool = (
  memberTeamContext: MemberTeamContext | null,
): AutoByteusSendMessageToTool => {
  const definition = ensureAutoByteusSendMessageToToolRegistered();
  const tool = new AutoByteusSendMessageToTool(undefined, { memberTeamContext });
  tool.definition = definition;
  return tool;
};
