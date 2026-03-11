import {
  asObject,
  asString,
  type ClaudeInterAgentRelayHandler,
  type ClaudeInterAgentRelayResult,
  type ClaudeRunSessionState,
  type ClaudeSdkModuleLike,
  type ClaudeRuntimeEvent,
} from "./claude-runtime-shared.js";
import { resolveSdkFunction, tryCallWithVariants } from "./claude-runtime-sdk-interop.js";
import { z } from "zod";

export type ClaudeSendMessageToolApprovalDecision = {
  approved: boolean;
  reason: string | null;
};

export type ClaudeSendMessageToolApprovalHandler = (input: {
  invocationId: string;
  toolName: string;
  toolArguments: Record<string, unknown>;
}) => Promise<ClaudeSendMessageToolApprovalDecision>;

const emitSendMessageToolStart = (options: {
  state: ClaudeRunSessionState;
  emitEvent: (state: ClaudeRunSessionState, event: ClaudeRuntimeEvent) => void;
  invocationId: string;
  toolArguments: Record<string, unknown>;
}): void => {
  options.emitEvent(options.state, {
    method: "item/added",
    params: {
      id: options.invocationId,
      turnId: options.state.activeTurnId,
      segment_type: "tool_call",
      tool_name: "send_message_to",
      arguments: options.toolArguments,
      metadata: {
        tool_name: "send_message_to",
        arguments: options.toolArguments,
      },
    },
  });
};

const emitSendMessageToolCompleted = (options: {
  state: ClaudeRunSessionState;
  emitEvent: (state: ClaudeRunSessionState, event: ClaudeRuntimeEvent) => void;
  invocationId: string;
  toolArguments: Record<string, unknown>;
  result: ClaudeInterAgentRelayResult;
}): void => {
  options.emitEvent(options.state, {
    method: "item/commandExecution/completed",
    params: {
      invocation_id: options.invocationId,
      tool_name: "send_message_to",
      ...(options.result.accepted
        ? {
            result: {
              accepted: true,
              code: options.result.code ?? null,
              message: options.result.message ?? null,
            },
          }
        : {
            error:
              options.result.message ??
              "Failed delivering message to teammate.",
          }),
    },
  });

  options.emitEvent(options.state, {
    method: "item/completed",
    params: {
      id: options.invocationId,
      turnId: options.state.activeTurnId,
      segment_type: "tool_call",
      tool_name: "send_message_to",
      arguments: options.toolArguments,
      metadata: {
        tool_name: "send_message_to",
        arguments: options.toolArguments,
        accepted: options.result.accepted,
        code: options.result.code ?? null,
        message: options.result.message ?? null,
      },
    },
  });
};

const handleSendMessageToToolInvocation = async (options: {
  state: ClaudeRunSessionState;
  rawArguments: unknown;
  interAgentRelayHandler: ClaudeInterAgentRelayHandler | null;
  autoExecuteTools: boolean;
  requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  emitEvent: (state: ClaudeRunSessionState, event: ClaudeRuntimeEvent) => void;
}): Promise<Record<string, unknown>> => {
  const args = asObject(options.rawArguments) ?? {};
  const recipientName = asString(args.recipient_name ?? args.recipientName ?? args.recipient);
  const content = asString(args.content);
  const messageType = asString(args.message_type ?? args.messageType) ?? "agent_message";

  const normalizedArguments: Record<string, unknown> = {
    recipient_name: recipientName ?? "",
    content: content ?? "",
    message_type: messageType,
  };

  const invocationId = `${options.state.runId}:send_message_to:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  emitSendMessageToolStart({
    state: options.state,
    emitEvent: options.emitEvent,
    invocationId,
    toolArguments: normalizedArguments,
  });

  if (!recipientName) {
    const result = {
      accepted: false,
      code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS",
      message: "send_message_to requires a non-empty recipient_name.",
    };
    emitSendMessageToolCompleted({
      state: options.state,
      emitEvent: options.emitEvent,
      invocationId,
      toolArguments: normalizedArguments,
      result,
    });
    return {
      content: [{ type: "text", text: result.message }],
      isError: true,
    };
  }

  if (!content) {
    const result = {
      accepted: false,
      code: "INVALID_MESSAGE_CONTENT",
      message: "send_message_to requires a non-empty content field.",
    };
    emitSendMessageToolCompleted({
      state: options.state,
      emitEvent: options.emitEvent,
      invocationId,
      toolArguments: normalizedArguments,
      result,
    });
    return {
      content: [{ type: "text", text: result.message }],
      isError: true,
    };
  }

  if (!options.interAgentRelayHandler || !options.state.teamRunId) {
    const result = {
      accepted: false,
      code: "INTER_AGENT_RELAY_UNSUPPORTED",
      message: "send_message_to relay handler is unavailable for this runtime session.",
    };
    emitSendMessageToolCompleted({
      state: options.state,
      emitEvent: options.emitEvent,
      invocationId,
      toolArguments: normalizedArguments,
      result,
    });
    return {
      content: [{ type: "text", text: result.message }],
      isError: true,
    };
  }

  if (!options.autoExecuteTools) {
    if (!options.requestToolApproval) {
      const result = {
        accepted: false,
        code: "TOOL_APPROVAL_UNAVAILABLE",
        message:
          "send_message_to approval handler is unavailable for this runtime session.",
      };
      emitSendMessageToolCompleted({
        state: options.state,
        emitEvent: options.emitEvent,
        invocationId,
        toolArguments: normalizedArguments,
        result,
      });
      return {
        content: [{ type: "text", text: result.message }],
        isError: true,
      };
    }

    const decision = await options.requestToolApproval({
      invocationId,
      toolName: "send_message_to",
      toolArguments: normalizedArguments,
    });
    if (!decision.approved) {
      const denialMessage = decision.reason ?? "send_message_to was denied by user.";
      const result = {
        accepted: false,
        code: "TOOL_EXECUTION_DENIED",
        message: denialMessage,
      };
      emitSendMessageToolCompleted({
        state: options.state,
        emitEvent: options.emitEvent,
        invocationId,
        toolArguments: normalizedArguments,
        result,
      });
      return {
        content: [{ type: "text", text: denialMessage }],
        isError: true,
      };
    }
  }

  const relayResult = await options.interAgentRelayHandler({
    senderRunId: options.state.runId,
    senderMemberName: options.state.memberName,
    senderTeamRunId: options.state.teamRunId,
    senderTurnId: options.state.activeTurnId,
    toolArguments: {
      recipient_name: recipientName,
      content,
      message_type: messageType,
    },
  });

  emitSendMessageToolCompleted({
    state: options.state,
    emitEvent: options.emitEvent,
    invocationId,
    toolArguments: normalizedArguments,
    result: relayResult,
  });

  if (!relayResult.accepted) {
    return {
      content: [
        {
          type: "text",
          text: relayResult.message ?? `Failed delivering message to teammate '${recipientName}'.`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: `Delivered message to '${recipientName}'.` }],
  };
};

export const buildClaudeTeamMcpServers = async (options: {
  state: ClaudeRunSessionState;
  sdk: ClaudeSdkModuleLike | null;
  interAgentRelayHandler: ClaudeInterAgentRelayHandler | null;
  autoExecuteTools: boolean;
  requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  emitEvent: (state: ClaudeRunSessionState, event: ClaudeRuntimeEvent) => void;
}): Promise<Record<string, unknown> | null> => {
  if (
    !options.state.sendMessageToEnabled ||
    !options.interAgentRelayHandler ||
    !options.state.teamRunId ||
    options.state.allowedRecipientNames.length === 0
  ) {
    return null;
  }

  const createSdkMcpServerFn = resolveSdkFunction(options.sdk, "createSdkMcpServer");
  if (!createSdkMcpServerFn) {
    return null;
  }

  const toolFn = resolveSdkFunction(options.sdk, "tool");
  const sendMessageToSchema = {
    recipient_name: z
      .string()
      .min(1, "recipient_name is required")
      .refine(
        (value) => options.state.allowedRecipientNames.includes(value),
        "recipient_name must match an allowed teammate name",
      )
      .describe("Recipient team member name."),
    content: z.string().min(1, "content is required").describe("Message content to deliver."),
    message_type: z.string().optional().describe("Optional message type label."),
  };
  const toolHandler = async (args: unknown): Promise<Record<string, unknown>> =>
    handleSendMessageToToolInvocation({
      state: options.state,
      rawArguments: args,
      interAgentRelayHandler: options.interAgentRelayHandler,
      autoExecuteTools: options.autoExecuteTools,
      requestToolApproval: options.requestToolApproval,
      emitEvent: options.emitEvent,
    });

  const toolDefinition = toolFn
    ? await tryCallWithVariants(toolFn, [
        [
          "send_message_to",
          "Send a message to another member in the same team run.",
          sendMessageToSchema,
          toolHandler,
        ],
      ])
    : {
        name: "send_message_to",
        description: "Send a message to another member in the same team run.",
        inputSchema: {
          recipient_name: {
            type: "string",
            description: "Recipient team member name.",
            enum: options.state.allowedRecipientNames,
          },
          content: {
            type: "string",
            description: "Message content to deliver.",
          },
          message_type: {
            type: "string",
            description: "Optional message type label.",
          },
        },
        handler: toolHandler,
      };

  const mcpServerConfig = await tryCallWithVariants(createSdkMcpServerFn, [
    [{ name: "autobyteus_team", tools: [toolDefinition] }],
  ]);

  const normalized = asObject(mcpServerConfig);
  if (!normalized) {
    return null;
  }

  return {
    autobyteus_team: normalized,
  };
};
