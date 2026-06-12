import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClaudeRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { ClaudeSendMessageToolCallHandler } from "../../../../../../src/agent-execution/backends/claude/agent-communication/claude-send-message-tool-call-handler.js";
import type { ClaudeSessionEvent } from "../../../../../../src/agent-execution/backends/claude/claude-runtime-shared.js";
import { SendMessageToDispatcher } from "../../../../../../src/agent-communication/services/send-message-to-dispatcher.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";

const buildRunContext = (input: {
  runId?: string;
  activeTurnId?: string | null;
  autoExecuteTools?: boolean;
} = {}): ClaudeRunContext => ({
  runId: input.runId ?? "run-professor",
  config: {
    agentDefinitionId: "agent-professor",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  },
  runtimeContext: {
    activeTurnId: input.activeTurnId ?? "turn-professor-1",
    autoExecuteTools: input.autoExecuteTools ?? true,
    memberTeamContext: null,
  },
}) as ClaudeRunContext;

const createHandler = (input: { autoExecuteTools?: boolean } = {}) => {
  const events: ClaudeSessionEvent[] = [];
  const handler = new ClaudeSendMessageToolCallHandler({
    requestToolApproval: null,
    emitEvent: (_runContext, event) => {
      events.push(event);
    },
  });
  return {
    handler,
    events,
    runContext: buildRunContext({ autoExecuteTools: input.autoExecuteTools }),
  };
};

describe("ClaudeSendMessageToolCallHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits canonical lifecycle events and dispatches through SendMessageToDispatcher", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_765_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.123456);
    const dispatch = vi.spyOn(SendMessageToDispatcher.prototype, "dispatch")
      .mockResolvedValue({ accepted: true, code: "DELIVERED", message: "Delivered globally." });
    const { handler, events, runContext } = createHandler();

    const result = await handler.handle({
      runContext,
      rawArguments: {
        target_agent_run_id: "active-target-run",
        content: " hello class ",
        message_type: "classroom_update",
      },
    });

    expect(result).toEqual({
      accepted: true,
      code: "DELIVERED",
      message: "Delivered globally.",
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "send_message_to",
      rawArguments: expect.objectContaining({ target_agent_run_id: "active-target-run" }),
      sender: expect.objectContaining({
        senderRunId: "run-professor",
        senderName: "agent-professor",
      }),
    }));
    expect(events.map((event) => event.method)).toEqual([
      ClaudeSessionEventName.ITEM_ADDED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      ClaudeSessionEventName.ITEM_COMPLETED,
    ]);

    const invocationId = (events[0]?.params as Record<string, unknown>).id;
    expect(invocationId).toEqual(expect.stringContaining("run-professor:send_message_to:"));
    expect(events[2]?.params).toMatchObject({
      invocation_id: invocationId,
      tool_name: "send_message_to",
      result: {
        accepted: true,
        code: "DELIVERED",
        message: "Delivered globally.",
      },
    });
    expect(events[3]?.params).toMatchObject({
      id: invocationId,
      metadata: {
        tool_name: "send_message_to",
        accepted: true,
        code: "DELIVERED",
        message: "Delivered globally.",
      },
    });
  });

  it("rejects malformed reference_files before dispatcher delivery", async () => {
    const dispatch = vi.spyOn(SendMessageToDispatcher.prototype, "dispatch");
    const { handler, runContext } = createHandler();

    const result = await handler.handle({
      runContext,
      rawArguments: {
        target_agent_run_id: "target-run",
        content: "hello",
        reference_files: ["relative/report.md"],
      },
    });

    expect(result).toEqual({
      accepted: false,
      code: "INVALID_REFERENCE_FILES",
      message: "send_message_to reference_files must be an array of absolute local file path strings. Invalid path must be absolute.",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("emits failure lifecycle events for rejected validation", async () => {
    const dispatch = vi.spyOn(SendMessageToDispatcher.prototype, "dispatch");
    const { handler, events, runContext } = createHandler();

    const result = await handler.handle({
      runContext,
      rawArguments: {
        target_agent_run_id: "target-run",
        content: "",
      },
    });

    expect(result).toEqual({
      accepted: false,
      code: "INVALID_MESSAGE_CONTENT",
      message: "send_message_to requires a non-empty content field.",
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(events.map((event) => event.method)).toEqual([
      ClaudeSessionEventName.ITEM_ADDED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      ClaudeSessionEventName.ITEM_COMPLETED,
    ]);
    expect(events[2]?.params).toMatchObject({
      tool_name: "send_message_to",
      error: "send_message_to requires a non-empty content field.",
    });
  });
});
