import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import type { JsonObject } from "../../../../../../src/agent-execution/backends/codex/codex-app-server-json.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { TeamAgentEventAdapter } from "../../../../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { createCodexThreadEventHarness } from "../../../../../fixtures/codex-thread-event-harness.js";

const strictTeamAdapter = new TeamAgentEventAdapter(() => null);

const expectStrictTeamAdmission = (events: readonly AgentRunEvent[]): void => {
  for (const event of events) {
    expect(strictTeamAdapter.adapt(event)).toMatchObject({ kind: "publish" });
  }
};

const emitMcpStarted = (
  harness: ReturnType<typeof createCodexThreadEventHarness>,
  turnId = "turn-1",
  invocationId = "call-1",
  toolName = "delegate_task",
): AgentRunEvent[] => harness.emitThroughThread({
  method: CodexThreadEventName.ITEM_STARTED,
  params: {
    turnId,
    item: {
      type: "mcpToolCall",
      id: invocationId,
      server: "agent_tools",
      tool: toolName,
      arguments: { recipient_address: "/worker" },
    },
  },
});

const emitLocalMcpCompleted = (
  harness: ReturnType<typeof createCodexThreadEventHarness>,
  turnId = "turn-1",
  invocationId = "call-1",
  toolName = "delegate_task",
): AgentRunEvent[] => harness.emitThroughThread({
  method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
  params: {
    turnId,
    invocation_id: invocationId,
    tool_name: toolName,
    result: { task_id: "task-1", status: "active" },
    item: {
      type: "mcpToolCall",
      id: invocationId,
      server: "agent_tools",
      tool: toolName,
      status: "completed",
    },
  },
});

const emitRawToolOutput = (
  harness: ReturnType<typeof createCodexThreadEventHarness>,
  params: JsonObject,
): AgentRunEvent[] => harness.emitThroughThread({
  method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
  params,
});

describe("Codex TOOL_LOG correlation", () => {
  it("correlates started/local-completed/raw output and admits it through the strict Team boundary", () => {
    const harness = createCodexThreadEventHarness("run-codex-tool-log");
    const started = emitMcpStarted(harness);
    const localCompleted = emitLocalMcpCompleted(harness);
    const rawOutput = emitRawToolOutput(harness, {
      turnId: "turn-1",
      item: {
        type: "functionCallOutput",
        call_id: "call-1",
        output: "{\"task_id\":\"task-1\",\"status\":\"active\"}",
      },
    });
    const turnCompleted = harness.emitThroughThread({
      method: CodexThreadEventName.TURN_COMPLETED,
      params: { turnId: "turn-1" },
    });

    expectStrictTeamAdmission([
      ...started,
      ...localCompleted,
      ...rawOutput,
      ...turnCompleted,
    ]);
    expect(rawOutput).toHaveLength(1);
    expect(rawOutput[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_LOG,
      payload: {
        tool_invocation_id: "call-1",
        tool_name: "delegate_task",
        log_entry: "{\"task_id\":\"task-1\",\"status\":\"active\"}",
      },
    });
    expect(strictTeamAdapter.adapt(rawOutput[0]!)).toEqual(expect.objectContaining({
      kind: "publish",
      event: expect.objectContaining({
        eventType: "TOOL_LOG",
        details: expect.objectContaining({
          toolInvocationId: "call-1",
          toolName: "delegate_task",
          turnId: "turn-1",
        }),
      }),
    }));
    expect(turnCompleted).toEqual([
      expect.objectContaining({ eventType: AgentRunEventType.TURN_COMPLETED }),
    ]);
  });

  it("uses an exact direct raw provider tool name without inventing correlation", () => {
    const harness = createCodexThreadEventHarness("run-direct-tool-log");

    const events = emitRawToolOutput(harness, {
      turnId: "turn-1",
      item: {
        type: "functionCallOutput",
        call_id: "call-direct",
        name: "direct_tool",
        output: "direct output",
      },
    });

    expect(events).toEqual([
      expect.objectContaining({
        eventType: AgentRunEventType.TOOL_LOG,
        payload: expect.objectContaining({
          tool_invocation_id: "call-direct",
          tool_name: "direct_tool",
          log_entry: "direct output",
        }),
      }),
    ]);
    expectStrictTeamAdmission(events);
  });

  it("suppresses incomplete, uncorrelated, wrong-turn, and post-terminal raw output", () => {
    const harness = createCodexThreadEventHarness("run-incomplete-tool-log");
    emitMcpStarted(harness);

    expect(emitRawToolOutput(harness, {
      turnId: "turn-1",
      item: { type: "functionCallOutput", output: "missing invocation" },
    })).toEqual([]);
    expect(emitRawToolOutput(harness, {
      turnId: "turn-1",
      item: { type: "functionCallOutput", call_id: "call-unknown", output: "unknown" },
    })).toEqual([]);
    expect(emitRawToolOutput(harness, {
      turnId: "turn-2",
      item: { type: "functionCallOutput", call_id: "call-1", output: "wrong turn" },
    })).toEqual([]);
    expect(emitRawToolOutput(harness, {
      turnId: "turn-1",
      item: { type: "functionCallOutput", call_id: "call-1", output: "   " },
    })).toEqual([]);

    const completion = harness.emitThroughThread({
      method: CodexThreadEventName.TURN_COMPLETED,
      params: { turnId: "turn-1" },
    });
    expectStrictTeamAdmission(completion);
    expect(emitRawToolOutput(harness, {
      turnId: "turn-1",
      item: { type: "functionCallOutput", call_id: "call-1", output: "after terminal" },
    })).toEqual([]);
  });

  it("fails closed when lifecycle facts conflict for the same invocation", () => {
    const harness = createCodexThreadEventHarness("run-conflicting-tool-log");
    emitMcpStarted(harness, "turn-1", "call-1", "delegate_task");
    emitLocalMcpCompleted(harness, "turn-1", "call-1", "review_task_result");

    expect(emitRawToolOutput(harness, {
      turnId: "turn-1",
      item: { type: "functionCallOutput", call_id: "call-1", output: "conflicted" },
    })).toEqual([]);
  });
});
