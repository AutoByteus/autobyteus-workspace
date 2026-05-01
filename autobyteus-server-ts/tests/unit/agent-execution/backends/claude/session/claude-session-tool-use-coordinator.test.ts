import { describe, expect, it } from "vitest";
import type { ClaudeRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import type { ClaudeSessionEvent } from "../../../../../../src/agent-execution/backends/claude/claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { ClaudeSessionToolUseCoordinator } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.js";

const buildRunContext = (
  input: { runId?: string; autoExecuteTools?: boolean; activeTurnId?: string | null } = {},
): ClaudeRunContext =>
  ({
    runId: input.runId ?? "run-claude-tool-coordinator",
    runtimeContext: {
      autoExecuteTools: input.autoExecuteTools ?? false,
      activeTurnId: input.activeTurnId ?? "turn-claude-tool-coordinator",
    },
  }) as ClaudeRunContext;

const createCoordinator = () => {
  const events: ClaudeSessionEvent[] = [];
  const coordinator = new ClaudeSessionToolUseCoordinator(
    new Map(),
    new Map(),
    (_runContext, event) => {
      events.push(event);
    },
  );
  return { coordinator, events };
};

describe("ClaudeSessionToolUseCoordinator", () => {
  it("emits segment and lifecycle lanes for raw assistant tool_use and preserves arguments on completion", () => {
    const { coordinator, events } = createCoordinator();
    const runContext = buildRunContext();

    coordinator.processToolLifecycleChunk(runContext, {
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu-bash-1",
            name: "Bash",
            input: {
              command: "pwd",
            },
          },
        ],
      },
    });
    coordinator.processToolLifecycleChunk(runContext, {
      type: "user",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu-bash-1",
            content: "workspace\n",
          },
        ],
      },
    });

    expect(events).toHaveLength(4);
    expect(events[0]).toEqual({
      method: ClaudeSessionEventName.ITEM_ADDED,
      params: {
        id: "toolu-bash-1",
        turn_id: "turn-claude-tool-coordinator",
        segment_type: "tool_call",
        tool_name: "Bash",
        arguments: {
          command: "pwd",
        },
        metadata: {
          tool_name: "Bash",
          arguments: {
            command: "pwd",
          },
        },
      },
    });
    expect(events[1]).toEqual({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: "toolu-bash-1",
        tool_name: "Bash",
        turn_id: "turn-claude-tool-coordinator",
        arguments: {
          command: "pwd",
        },
      },
    });
    expect(events[2]).toEqual({
      method: ClaudeSessionEventName.ITEM_COMPLETED,
      params: {
        id: "toolu-bash-1",
        turn_id: "turn-claude-tool-coordinator",
        segment_type: "tool_call",
        tool_name: "Bash",
        arguments: {
          command: "pwd",
        },
        metadata: {
          tool_name: "Bash",
          arguments: {
            command: "pwd",
          },
          result: "workspace\n",
        },
      },
    });
    expect(events[3]).toEqual({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "toolu-bash-1",
        tool_name: "Bash",
        turn_id: "turn-claude-tool-coordinator",
        arguments: {
          command: "pwd",
        },
        result: "workspace\n",
      },
    });
  });

  it("does not emit duplicate started when raw observation and permission callback share an invocation", async () => {
    const { coordinator, events } = createCoordinator();
    const runContext = buildRunContext({ autoExecuteTools: true });

    coordinator.processToolLifecycleChunk(runContext, {
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu-write-1",
            name: "Write",
            input: {
              file_path: "notes.txt",
              content: "hello",
            },
          },
        ],
      },
    });
    await coordinator.handleToolPermissionCheck(
      runContext,
      "Write",
      {
        file_path: "notes.txt",
        content: "hello",
      },
      { toolUseID: "toolu-write-1" },
    );

    const startedEvents = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
    );
    const segmentStartEvents = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_ADDED,
    );
    expect(segmentStartEvents).toHaveLength(1);
    expect(segmentStartEvents[0]?.params).toMatchObject({
      id: "toolu-write-1",
      tool_name: "Write",
      metadata: {
        tool_name: "Write",
        arguments: {
          file_path: "notes.txt",
          content: "hello",
        },
      },
    });
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]?.params).toMatchObject({
      invocation_id: "toolu-write-1",
      tool_name: "Write",
      arguments: {
        file_path: "notes.txt",
        content: "hello",
      },
    });
    expect(events).toContainEqual({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED,
      params: {
        invocation_id: "toolu-write-1",
        tool_name: "Write",
        turn_id: "turn-claude-tool-coordinator",
        arguments: {
          file_path: "notes.txt",
          content: "hello",
        },
        reason: "auto_execute_tools_enabled",
      },
    });
  });

  it("preserves permission-path started emission when raw observation arrives later", async () => {
    const { coordinator, events } = createCoordinator();
    const runContext = buildRunContext({ autoExecuteTools: true });

    await coordinator.handleToolPermissionCheck(
      runContext,
      "Write",
      {
        file_path: "later.txt",
        content: "from permission",
      },
      { toolUseID: "toolu-write-2" },
    );
    coordinator.processToolLifecycleChunk(runContext, {
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu-write-2",
            name: "Write",
            input: {
              file_path: "later.txt",
              content: "from permission",
            },
          },
        ],
      },
    });

    const startedEvents = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
    );
    const segmentStartEvents = events.filter(
      (event) => event.method === ClaudeSessionEventName.ITEM_ADDED,
    );
    expect(segmentStartEvents).toHaveLength(1);
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]?.params).toMatchObject({
      invocation_id: "toolu-write-2",
      arguments: {
        file_path: "later.txt",
        content: "from permission",
      },
    });
  });

  it("terminalizes both segment and lifecycle lanes when permission is denied before raw tool_result", async () => {
    const { coordinator, events } = createCoordinator();
    const runContext = buildRunContext({ autoExecuteTools: false });

    const permissionResult = coordinator.handleToolPermissionCheck(
      runContext,
      "Bash",
      {
        command: "rm -rf /tmp/nope",
      },
      { toolUseID: "toolu-denied-1" },
    );
    await Promise.resolve();
    await coordinator.approveTool(runContext.runId, "toolu-denied-1", false, "Denied by policy");

    await expect(permissionResult).resolves.toMatchObject({
      behavior: "deny",
      message: "Denied by policy",
      toolUseID: "toolu-denied-1",
    });

    expect(events.map((event) => event.method)).toEqual([
      ClaudeSessionEventName.ITEM_ADDED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
      ClaudeSessionEventName.ITEM_COMPLETED,
      ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
    ]);
    expect(events[3]?.params).toMatchObject({
      id: "toolu-denied-1",
      segment_type: "tool_call",
      tool_name: "Bash",
      metadata: {
        tool_name: "Bash",
        arguments: {
          command: "rm -rf /tmp/nope",
        },
        error: "Denied by policy",
        reason: "Denied by policy",
      },
    });
    expect(events[4]?.params).toMatchObject({
      invocation_id: "toolu-denied-1",
      tool_name: "Bash",
      turn_id: "turn-claude-tool-coordinator",
      arguments: {
        command: "rm -rf /tmp/nope",
      },
      reason: "Denied by policy",
      error: "Denied by policy",
    });
  });

  it("keeps send_message_to raw tool_use lifecycle suppressed", () => {
    const { coordinator, events } = createCoordinator();
    const runContext = buildRunContext();

    coordinator.processToolLifecycleChunk(runContext, {
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "toolu-send-message-1",
            name: "mcp__autobyteus_team__send_message_to",
            input: {
              recipient_name: "worker",
              content: "hello",
            },
          },
        ],
      },
    });
    coordinator.processToolLifecycleChunk(runContext, {
      type: "user",
      message: {
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu-send-message-1",
            content: "{\"ok\":true}",
          },
        ],
      },
    });

    expect(events).toEqual([]);
  });
});
