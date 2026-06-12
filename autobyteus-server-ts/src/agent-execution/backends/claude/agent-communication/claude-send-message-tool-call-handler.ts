import {
  asObject,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { CLAUDE_SEND_MESSAGE_TOOL_NAME } from "../claude-send-message-tool-name.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import type { AgentOperationResult } from "../../../domain/agent-operation-result.js";
import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "../../../../agent-communication/services/send-message-to-tool-argument-parser.js";
import { getSendMessageToDispatcher } from "../../../../agent-communication/services/send-message-to-dispatcher.js";

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

  options.emitEvent(options.runContext, {
    method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
    params: {
      invocation_id: options.invocationId,
      turnId: options.runContext.runtimeContext.activeTurnId,
      tool_name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
      arguments: options.toolArguments,
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
      turnId: options.runContext.runtimeContext.activeTurnId,
      tool_name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
      arguments: options.toolArguments,
      ...(options.result.accepted
        ? {
            result: {
              accepted: true,
              code: options.result.code ?? null,
              message: options.result.message ?? null,
            },
          }
        : {
            error: options.result.message ?? "send_message_to failed.",
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
  private readonly requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  private readonly emitEvent: (
    runContext: ClaudeRunContext,
    event: ClaudeSessionEvent,
  ) => void;

  constructor(options: ClaudeSendMessageToolCallHandlerOptions) {
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
      ...(parsed.recipientName ? { recipient_name: parsed.recipientName } : {}),
      ...(parsed.targetAgentRunId ? { target_agent_run_id: parsed.targetAgentRunId } : {}),
      content: parsed.content ?? "",
      message_type: parsed.messageType,
      ...(parsed.referenceFiles.length > 0 ? { reference_files: parsed.referenceFiles } : {}),
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

    const sendMessageToResult = await getSendMessageToDispatcher().dispatch({
      toolName: CLAUDE_SEND_MESSAGE_TOOL_NAME,
      rawArguments: args,
      sender: buildAgentRunMessageSenderContext({
        senderRunId: options.runContext.runId,
        senderName:
          options.runContext.runtimeContext.memberTeamContext?.memberName ??
          options.runContext.config.agentDefinitionId,
        runtimeKind: options.runContext.config.runtimeKind,
        memberTeamContext: options.runContext.runtimeContext.memberTeamContext,
      }),
    });

    emitSendMessageToolCompleted({
      runContext: options.runContext,
      emitEvent: this.emitEvent,
      invocationId,
      toolArguments: normalizedArguments,
      result: sendMessageToResult,
    });

    return {
      accepted: sendMessageToResult.accepted,
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
