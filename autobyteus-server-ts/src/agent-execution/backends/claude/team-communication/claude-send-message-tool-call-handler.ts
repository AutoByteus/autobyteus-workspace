import {
  asObject,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { CLAUDE_SEND_MESSAGE_TOOL_NAME } from "../claude-send-message-tool-name.js";
import type {
  InterAgentMessageDeliveryHandler,
} from "../../../../agent-team-execution/domain/inter-agent-message-delivery.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "../../../../agent-team-execution/services/send-message-to-tool-argument-parser.js";

export type ClaudeSendMessageToolApprovalDecision = {
  approved: boolean;
  reason: string | null;
};

export type ClaudeSendMessageToolApprovalHandler = (input: {
  invocationId: string;
  toolName: string;
  toolArguments: Record<string, unknown>;
}) => Promise<ClaudeSendMessageToolApprovalDecision>;

type ClaudeSendMessageToolCallHandlerOptions = {
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;
  requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  emitEvent: (runContext: ClaudeRunContext, event: ClaudeSessionEvent) => void;
};

const emitSendMessageToolStart = (options: {
  runContext: ClaudeRunContext;
  emitEvent: (runContext: ClaudeRunContext, event: ClaudeSessionEvent) => void;
  invocationId: string;
  toolArguments: Record<string, unknown>;
}): void => {
  options.emitEvent(options.runContext, {
    method: ClaudeSessionEventName.ITEM_ADDED,
    params: {
      id: options.invocationId,
      turnId: options.runContext.runtimeContext.activeTurnId,
      segment_type: "tool_call",
      tool_name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
      arguments: options.toolArguments,
      metadata: {
        tool_name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
        arguments: options.toolArguments,
      },
    },
  });
};

const emitSendMessageToolCompleted = (options: {
  runContext: ClaudeRunContext;
  emitEvent: (runContext: ClaudeRunContext, event: ClaudeSessionEvent) => void;
  invocationId: string;
  toolArguments: Record<string, unknown>;
  result: AgentOperationResult;
}): void => {
  options.emitEvent(options.runContext, {
    method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
    params: {
      invocation_id: options.invocationId,
      tool_name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
      ...(options.result.accepted
        ? {
            result: {
              accepted: true,
              code: options.result.code ?? null,
              message: options.result.message ?? null,
            },
          }
        : {
            error: options.result.message ?? "Failed delivering message to teammate.",
          }),
    },
  });

  options.emitEvent(options.runContext, {
    method: ClaudeSessionEventName.ITEM_COMPLETED,
    params: {
      id: options.invocationId,
      turnId: options.runContext.runtimeContext.activeTurnId,
      segment_type: "tool_call",
      tool_name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
      arguments: options.toolArguments,
      metadata: {
        tool_name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
        arguments: options.toolArguments,
        accepted: options.result.accepted,
        code: options.result.code ?? null,
        message: options.result.message ?? null,
      },
    },
  });
};

export class ClaudeSendMessageToolCallHandler {
  private readonly deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;
  private readonly requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  private readonly emitEvent: (
    runContext: ClaudeRunContext,
    event: ClaudeSessionEvent,
  ) => void;

  constructor(options: ClaudeSendMessageToolCallHandlerOptions) {
    this.deliverInterAgentMessage = options.deliverInterAgentMessage;
    this.requestToolApproval = options.requestToolApproval;
    this.emitEvent = options.emitEvent;
  }

  async handle(options: {
    runContext: ClaudeRunContext;
    rawArguments: unknown;
  }): Promise<Record<string, unknown>> {
    const args = asObject(options.rawArguments) ?? {};
    const parsed = parseSendMessageToToolArguments(args);

    const normalizedArguments: Record<string, unknown> = {
      recipient_name: parsed.recipientName ?? "",
      content: parsed.content ?? "",
      message_type: parsed.messageType,
    };

    const invocationId = `${options.runContext.runId}:${CLAUDE_SEND_MESSAGE_TOOL_NAME}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    emitSendMessageToolStart({
      runContext: options.runContext,
      emitEvent: this.emitEvent,
      invocationId,
      toolArguments: normalizedArguments,
    });

    const validationError = validateParsedSendMessageToToolArguments(
      CLAUDE_SEND_MESSAGE_TOOL_NAME,
      parsed,
    );
    if (validationError) {
      return this.buildRejectedResult({
        runContext: options.runContext,
        invocationId,
        toolArguments: normalizedArguments,
        code: validationError.code,
        message: validationError.message,
      });
    }

    const memberTeamContext = options.runContext.runtimeContext.memberTeamContext;
    if (!this.deliverInterAgentMessage || !memberTeamContext?.teamRunId) {
      return this.buildRejectedResult({
        runContext: options.runContext,
        invocationId,
        toolArguments: normalizedArguments,
        code: "INTER_AGENT_RELAY_UNSUPPORTED",
        message: "send_message_to delivery handler is unavailable for this runtime session.",
      });
    }

    if (!options.runContext.runtimeContext.autoExecuteTools) {
      if (!this.requestToolApproval) {
        return this.buildRejectedResult({
          runContext: options.runContext,
          invocationId,
          toolArguments: normalizedArguments,
          code: "TOOL_APPROVAL_UNAVAILABLE",
          message: "send_message_to approval handler is unavailable for this runtime session.",
        });
      }

      const decision = await this.requestToolApproval({
        invocationId,
        toolName: CLAUDE_SEND_MESSAGE_TOOL_NAME,
        toolArguments: normalizedArguments,
      });
      if (!decision.approved) {
        return this.buildRejectedResult({
          runContext: options.runContext,
          invocationId,
          toolArguments: normalizedArguments,
          code: "TOOL_EXECUTION_DENIED",
          message: decision.reason ?? "send_message_to was denied by user.",
        });
      }
    }

    if (!parsed.recipientName || !parsed.content) {
      return this.buildRejectedResult({
        runContext: options.runContext,
        invocationId,
        toolArguments: normalizedArguments,
        code: "INVALID_TOOL_ARGUMENTS",
        message: "send_message_to requires non-empty recipientMemberName and content.",
      });
    }

    const recipientMemberName = parsed.recipientName.trim();
    const content = parsed.content.trim();
    const sendMessageToResult = await this.deliverInterAgentMessage({
      senderRunId: options.runContext.runId,
      teamRunId: memberTeamContext.teamRunId,
      recipientMemberName,
      content,
      messageType: parsed.messageType,
    });

    emitSendMessageToolCompleted({
      runContext: options.runContext,
      emitEvent: this.emitEvent,
      invocationId,
      toolArguments: normalizedArguments,
      result: sendMessageToResult,
    });

    if (!sendMessageToResult.accepted) {
      return {
        accepted: false,
        code: sendMessageToResult.code ?? null,
        message: sendMessageToResult.message ?? "Failed delivering message to teammate.",
      };
    }

    return {
      accepted: true,
      code: sendMessageToResult.code ?? null,
      message: sendMessageToResult.message ?? null,
    };
  }

  private buildRejectedResult(options: {
    runContext: ClaudeRunContext;
    invocationId: string;
    toolArguments: Record<string, unknown>;
    code: string;
    message: string;
  }): Record<string, unknown> {
    const result = {
      accepted: false,
      code: options.code,
      message: options.message,
    };
    emitSendMessageToolCompleted({
      runContext: options.runContext,
      emitEvent: this.emitEvent,
      invocationId: options.invocationId,
      toolArguments: options.toolArguments,
      result,
    });
    return result;
  }
}
