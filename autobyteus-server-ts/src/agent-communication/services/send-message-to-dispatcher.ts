import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { buildInterAgentMessageDeliveryIntent } from "../../agent-team-execution/services/inter-agent-message-delivery-intent-builder.js";
import type { AgentRunMessageSenderContext } from "../domain/agent-run-message-sender.js";
import { describeSendMessageTargetSelector } from "../domain/send-message-target-selector.js";
import {
  getGlobalAgentRunMessageRouter,
  type GlobalAgentRunMessageDeliveryInput,
  GlobalAgentRunMessageRouter,
} from "./global-agent-run-message-router.js";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "./send-message-to-tool-argument-parser.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "./send-message-to-tool-contract.js";

export type SendMessageToDispatcherInput = {
  toolName?: string | null;
  rawArguments: Record<string, unknown>;
  sender: AgentRunMessageSenderContext;
};

export class SendMessageToDispatcher {
  private static instance: SendMessageToDispatcher | null = null;

  static getInstance(): SendMessageToDispatcher {
    if (!SendMessageToDispatcher.instance) {
      SendMessageToDispatcher.instance = new SendMessageToDispatcher();
    }
    return SendMessageToDispatcher.instance;
  }

  static resetInstance(): void {
    SendMessageToDispatcher.instance = null;
  }

  constructor(private readonly deps: {
    globalRouter?: GlobalAgentRunMessageRouter;
  } = {}) {}

  async dispatch(input: SendMessageToDispatcherInput): Promise<AgentOperationResult> {
    const toolName = input.toolName?.trim() || SEND_MESSAGE_TO_TOOL_NAME;
    const parsed = parseSendMessageToToolArguments(input.rawArguments);
    const validationError = validateParsedSendMessageToToolArguments(toolName, parsed);
    if (validationError) {
      return {
        accepted: false,
        code: validationError.code,
        message: validationError.message,
      };
    }
    if (!parsed.target || !parsed.content) {
      return {
        accepted: false,
        code: "INVALID_TOOL_ARGUMENTS",
        message: `${toolName} requires exactly one target selector and non-empty content.`,
      };
    }

    const content = parsed.content.trim();
    if (parsed.target.kind === "target_agent_run_id") {
      return this.globalRouter.deliver({
        sender: input.sender,
        targetAgentRunId: parsed.target.targetAgentRunId,
        content,
        messageType: parsed.messageType,
        referenceFiles: parsed.referenceFiles,
      } satisfies GlobalAgentRunMessageDeliveryInput);
    }

    const memberTeamContext = input.sender.memberTeamContext;
    if (!memberTeamContext?.sendMessageToEnabled || !memberTeamContext.deliverInterAgentMessage) {
      return {
        accepted: false,
        code: "TEAM_CONTEXT_REQUIRED",
        message: `${toolName} recipient_name delivery requires an active team member context with send_message_to enabled.`,
      };
    }

    const intentResult = buildInterAgentMessageDeliveryIntent({
      memberTeamContext,
      target: parsed.target,
      content,
      messageType: parsed.messageType,
      referenceFiles: parsed.referenceFiles,
    });
    if (!intentResult.ok) {
      return {
        accepted: false,
        code: intentResult.code,
        message: intentResult.message,
      };
    }

    const result = await memberTeamContext.deliverInterAgentMessage(intentResult.intent);
    if (!result.accepted) {
      return result;
    }
    return {
      ...result,
      code: result.code ?? "DELIVERED",
      message: result.message ?? `Delivered message to ${describeSendMessageTargetSelector(parsed.target)}.`,
    };
  }

  private get globalRouter(): GlobalAgentRunMessageRouter {
    return this.deps.globalRouter ?? getGlobalAgentRunMessageRouter();
  }
}

export const getSendMessageToDispatcher = (): SendMessageToDispatcher =>
  SendMessageToDispatcher.getInstance();
