import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunMessageSenderContext } from "../domain/agent-run-message-sender.js";
import { describeSendMessageTargetSelector } from "../domain/send-message-target-selector.js";
import { isCollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
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
import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

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

    const memberExecutionContext = input.sender.memberExecutionContext;
    const delivery = memberExecutionContext?.collaboration.deliverLogicalMessage ?? null;
    if (!memberExecutionContext || !delivery) {
      return {
        accepted: false,
        code: "COLLABORATION_CONTEXT_REQUIRED",
        message: `${toolName} recipient_address delivery requires an active collaboration context.`,
      };
    }

    let result: AgentOperationResult;
    try {
      result = await delivery({
      recipientAddress: assertAgentTeamAddress(parsed.target.recipientAddress),
      content,
      messageType: parsed.messageType,
      referenceFiles: parsed.referenceFiles,
      });
    } catch (error) {
      if (!isCollaborationContractError(error)) {
        throw error;
      }
      return { accepted: false, code: error.code, message: error.message };
    }
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
