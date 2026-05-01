import { describe, expect, it } from "vitest";
import type { ClaudeRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import type { ClaudeSessionEvent } from "../../../../../../src/agent-execution/backends/claude/claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { ClaudeSessionToolUseCoordinator } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.js";

const buildRunContext = (
  input: { runId?: string; autoExecuteTools?: boolean } = {},
): ClaudeRunContext =>
  ({
    runId: input.runId ?? "run-claude-tool-coordinator",
    runtimeContext: {
      autoExecuteTools: input.autoExecuteTools ?? false,
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
  it("emits started with arguments for raw assistant tool_use and preserves arguments on completion", () => {
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

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: "toolu-bash-1",
        tool_name: "Bash",
        arguments: {
          command: "pwd",
        },
      },
    });
    expect(events[1]).toEqual({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "toolu-bash-1",
        tool_name: "Bash",
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
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]?.params).toMatchObject({
      invocation_id: "toolu-write-2",
      arguments: {
        file_path: "later.txt",
        content: "from permission",
      },
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
