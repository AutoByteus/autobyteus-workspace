import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClaudeRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { ClaudeSendMessageToolCallHandler } from "../../../../../../src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.js";
import type { ClaudeSessionEvent } from "../../../../../../src/agent-execution/backends/claude/claude-runtime-shared.js";

const buildRunContext = (input: {
  runId?: string;
  activeTurnId?: string | null;
  autoExecuteTools?: boolean;
  teamRunId?: string | null;
} = {}): ClaudeRunContext => ({
  runId: input.runId ?? "run-professor",
  runtimeContext: {
    activeTurnId: input.activeTurnId ?? "turn-professor-1",
    autoExecuteTools: input.autoExecuteTools ?? true,
    memberTeamContext: input.teamRunId === null
      ? null
      : {
          teamRunId: input.teamRunId ?? "team-classroom-1",
        },
  },
}) as ClaudeRunContext;

const createHandler = (input: {
  deliverResult?: { accepted: boolean; code?: string | null; message?: string | null };
  autoExecuteTools?: boolean;
  teamRunId?: string | null;
} = {}) => {
  const events: ClaudeSessionEvent[] = [];
  const deliverInterAgentMessage = vi.fn().mockResolvedValue(
    input.deliverResult ?? {
      accepted: true,
      code: null,
      message: "Delivered message to student.",
    },
  );
  const handler = new ClaudeSendMessageToolCallHandler({
    deliverInterAgentMessage,
    requestToolApproval: null,
    emitEvent: (_runContext, event) => {
      events.push(event);
    },
  });
  return {
    handler,
    events,
    deliverInterAgentMessage,
    runContext: buildRunContext({
      autoExecuteTools: input.autoExecuteTools,
      teamRunId: input.teamRunId,
    }),
  };
};

describe("ClaudeSendMessageToolCallHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits canonical segment start, lifecycle start, success lifecycle, and segment end", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_765_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.123456);
    const { handler, events, deliverInterAgentMessage, runContext } = createHandler();

    const result = await handler.handle({
      runContext,
      rawArguments: {
        recipient_name: " student ",
        content: " hello class ",
        message_type: "classroom_update",
      },
    });

    expect(result).toEqual({
      accepted: true,
      code: null,
      message: "Delivered message to student.",
    });
    expect(deliverInterAgentMessage).toHaveBeenCalledWith({
      senderRunId: "run-professor",
      teamRunId: "team-classroom-1",
      recipientMemberName: "student",
      content: "hello class",
      messageType: "classroom_update",
      referenceFiles: [],
    });
    expect(events.map((event) => event.method)).toEqual([
      ClaudeSessionEventName.ITEM_ADDED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      ClaudeSessionEventName.ITEM_COMPLETED,
    ]);

    const invocationId = (events[0]?.params as Record<string, unknown>).id;
    const expectedArguments = {
      recipient_name: " student ",
      content: " hello class ",
      message_type: "classroom_update",
    };
    expect(invocationId).toEqual(expect.stringContaining("run-professor:send_message_to:"));
    expect(events[0]?.params).toMatchObject({
      id: invocationId,
      turnId: "turn-professor-1",
      segment_type: "tool_call",
      tool_name: "send_message_to",
      arguments: expectedArguments,
      metadata: {
        tool_name: "send_message_to",
        arguments: expectedArguments,
      },
    });
    expect(events[1]?.params).toMatchObject({
      invocation_id: invocationId,
      turnId: "turn-professor-1",
      tool_name: "send_message_to",
      arguments: expectedArguments,
    });
    expect(events[2]?.params).toMatchObject({
      invocation_id: invocationId,
      turnId: "turn-professor-1",
      tool_name: "send_message_to",
      arguments: expectedArguments,
      result: {
        accepted: true,
        code: null,
        message: "Delivered message to student.",
      },
    });
    expect(events[3]?.params).toMatchObject({
      id: invocationId,
      tool_name: "send_message_to",
      arguments: expectedArguments,
      metadata: {
        tool_name: "send_message_to",
        arguments: expectedArguments,
        accepted: true,
        code: null,
        message: "Delivered message to student.",
      },
    });
  });


  it("delivers normalized explicit reference_files", async () => {
    const { handler, events, deliverInterAgentMessage, runContext } = createHandler();

    const result = await handler.handle({
      runContext,
      rawArguments: {
        recipient_name: "student",
        content: "Please inspect the listed file.",
        reference_files: [" /tmp/report.md ", "/tmp/report.md", "/tmp/evidence.log"],
      },
    });

    expect(result.accepted).toBe(true);
    expect(deliverInterAgentMessage).toHaveBeenCalledWith(expect.objectContaining({
      recipientMemberName: "student",
      content: "Please inspect the listed file.",
      referenceFiles: ["/tmp/report.md", "/tmp/evidence.log"],
    }));
    expect(events[0]?.params).toMatchObject({
      arguments: expect.objectContaining({
        reference_files: ["/tmp/report.md", "/tmp/evidence.log"],
      }),
    });
  });

  it("rejects malformed reference_files before delivery", async () => {
    const { handler, deliverInterAgentMessage, runContext } = createHandler();

    const result = await handler.handle({
      runContext,
      rawArguments: {
        recipient_name: "student",
        content: "hello",
        reference_files: ["relative/report.md"],
      },
    });

    expect(result).toEqual({
      accepted: false,
      code: "INVALID_REFERENCE_FILES",
      message: "send_message_to reference_files must be an array of absolute local file path strings. Invalid path must be absolute.",
    });
    expect(deliverInterAgentMessage).not.toHaveBeenCalled();
  });

  it("emits canonical lifecycle start and failure with arguments for rejected validation", async () => {
    const { handler, events, deliverInterAgentMessage, runContext } = createHandler();

    const result = await handler.handle({
      runContext,
      rawArguments: {
        recipient_name: "student",
        content: "",
      },
    });

    expect(result).toEqual({
      accepted: false,
      code: "INVALID_MESSAGE_CONTENT",
      message: "send_message_to requires a non-empty content field.",
    });
    expect(deliverInterAgentMessage).not.toHaveBeenCalled();
    expect(events.map((event) => event.method)).toEqual([
      ClaudeSessionEventName.ITEM_ADDED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      ClaudeSessionEventName.ITEM_COMPLETED,
    ]);

    const invocationId = (events[0]?.params as Record<string, unknown>).id;
    const expectedArguments = {
      recipient_name: "student",
      content: "",
      message_type: "agent_message",
    };
    expect(events[1]?.params).toMatchObject({
      invocation_id: invocationId,
      tool_name: "send_message_to",
      arguments: expectedArguments,
    });
    expect(events[2]?.params).toMatchObject({
      invocation_id: invocationId,
      tool_name: "send_message_to",
      arguments: expectedArguments,
      error: "send_message_to requires a non-empty content field.",
    });
    expect(events[3]?.params).toMatchObject({
      id: invocationId,
      metadata: {
        tool_name: "send_message_to",
        arguments: expectedArguments,
        accepted: false,
        code: "INVALID_MESSAGE_CONTENT",
        message: "send_message_to requires a non-empty content field.",
      },
    });
  });
});
