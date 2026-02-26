import { StreamEventType } from "autobyteus-ts";
import { beforeEach, describe, expect, it } from "vitest";
import { RuntimeEventMessageMapper } from "../../../../src/services/agent-streaming/runtime-event-message-mapper.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";

describe("RuntimeEventMessageMapper", () => {
  let mapper: RuntimeEventMessageMapper;

  beforeEach(() => {
    mapper = new RuntimeEventMessageMapper();
  });

  it("maps autobyteus segment stream events", () => {
    const message = mapper.map({
      event_type: StreamEventType.SEGMENT_EVENT,
      data: {
        event_type: "SEGMENT_CONTENT",
        segment_id: "seg-1",
        segment_type: "text",
        payload: { delta: "hello" },
      },
      agent_id: "agent-1",
    });
    expect(message.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(message.payload.delta).toBe("hello");
    expect(message.payload.segment_type).toBe("text");
    expect(message.payload.id).toBe("seg-1");
  });

  it("maps autobyteus assistant-complete stream events", () => {
    const complete = mapper.map({
      event_type: StreamEventType.ASSISTANT_COMPLETE_RESPONSE,
      data: { content: "done" },
      agent_id: "agent-complete",
    });
    expect(complete.type).toBe(ServerMessageType.ASSISTANT_COMPLETE);
  });

  it("normalizes codex method aliases and maps output delta to segment content", () => {
    const message = mapper.map({
      method: "item.outputText.delta",
      params: { itemId: "item-1", delta: "abc" },
    });
    expect(message.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(message.payload.id).toBe("item-1");
    expect(message.payload.delta).toBe("abc");
    expect(message.payload.segment_type).toBe("text");
    expect(message.payload.runtime_event_method).toBe("item/outputText/delta");
  });

  it("maps codex turn lifecycle and progress methods", () => {
    const started = mapper.map({ method: "turn.started", params: { turn_id: "turn-1" } });
    expect(started.type).toBe(ServerMessageType.AGENT_STATUS);
    expect(started.payload.runtime_event_method).toBe("turn/started");

    const diff = mapper.map({ method: "turn.diff_updated", params: { path: "a.ts" } });
    expect(diff.type).toBe(ServerMessageType.ARTIFACT_UPDATED);
    expect(diff.payload.runtime_event_method).toBe("turn/diffUpdated");

    const progress = mapper.map({ method: "turn.plan_updated", params: { tasks: [] } });
    expect(progress.type).toBe(ServerMessageType.TODO_LIST_UPDATE);
    expect(progress.payload.runtime_event_method).toBe("turn/taskProgressUpdated");
  });

  it("maps codex item lifecycle methods", () => {
    const added = mapper.map({
      method: "item.created",
      params: { item: { id: "item-1", type: "assistant_message" } },
    });
    expect(added.type).toBe(ServerMessageType.SEGMENT_START);
    expect(added.payload.id).toBe("item-1");
    expect(added.payload.segment_type).toBe("text");
    expect(added.payload.runtime_event_method).toBe("item/added");

    const delta = mapper.map({ method: "item.updated", params: { id: "item-1", delta: "d" } });
    expect(delta.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(delta.payload.runtime_event_method).toBe("item/delta");

    const completed = mapper.map({ method: "item.completed", params: { id: "item-1" } });
    expect(completed.type).toBe(ServerMessageType.SEGMENT_END);
    expect(completed.payload.runtime_event_method).toBe("item/completed");
  });

  it("maps codex command-execution item variants to run_bash segment start", () => {
    const added = mapper.map({
      method: "item.created",
      params: {
        item: {
          id: "item-cmd-1",
          type: "command_execution_call",
          name: "run_bash",
          command: "/bin/bash -lc 'python fibonacci.py'",
        },
        invocation_id: "inv-cmd-1",
      },
    });

    expect(added.type).toBe(ServerMessageType.SEGMENT_START);
    expect(added.payload.segment_type).toBe("run_bash");
    expect(added.payload.id).toBe("inv-cmd-1");
    expect(added.payload.metadata?.tool_name).toBe("run_bash");
    expect(added.payload.metadata?.command).toBe("/bin/bash -lc 'python fibonacci.py'");
  });

  it("maps codex file-change item variants to edit_file segment start", () => {
    const added = mapper.map({
      method: "item.created",
      params: {
        item: {
          id: "item-edit-1",
          type: "file_change_call",
          path: "src/example.ts",
          name: "edit_file",
        },
      },
    });

    expect(added.type).toBe(ServerMessageType.SEGMENT_START);
    expect(added.payload.segment_type).toBe("edit_file");
    expect(added.payload.id).toBe("item-edit-1");
    expect(added.payload.metadata?.path).toBe("src/example.ts");
    expect(added.payload.metadata?.tool_name).toBe("edit_file");
  });

  it("maps codex web-search item lifecycle to canonical search_web tool_call segment", () => {
    const started = mapper.map({
      method: "item/started",
      params: {
        item: {
          id: "ws_1",
          type: "webSearch",
          query: "",
          action: { type: "other" },
        },
        threadId: "thread-1",
        turnId: "turn-1",
      },
    });

    expect(started.type).toBe(ServerMessageType.SEGMENT_START);
    expect(started.payload.id).toBe("ws_1");
    expect(started.payload.segment_type).toBe("tool_call");
    expect(started.payload.metadata?.tool_name).toBe("search_web");
    expect(started.payload.runtime_event_method).toBe("item/added");

    const completed = mapper.map({
      method: "item/completed",
      params: {
        item: {
          id: "ws_1",
          type: "webSearch",
          query: "Elon Musk latest news",
          action: {
            type: "search",
            query: "Elon Musk latest news",
            queries: ["Elon Musk latest news", "Elon Musk Reuters"],
          },
        },
        threadId: "thread-1",
        turnId: "turn-1",
      },
    });

    expect(completed.type).toBe(ServerMessageType.SEGMENT_END);
    expect(completed.payload.id).toBe("ws_1");
    expect(completed.payload.metadata?.tool_name).toBe("search_web");
    expect(completed.payload.metadata?.arguments).toEqual({
      query: "Elon Musk latest news",
      action_type: "search",
      queries: ["Elon Musk latest news", "Elon Musk Reuters"],
    });
    expect(completed.payload.runtime_event_method).toBe("item/completed");
  });

  it("suppresses codex web_search_begin/end mirror events as no-op segment content", () => {
    const begin = mapper.map({
      method: "codex/event/web_search_begin",
      params: {
        id: "turn-77",
        msg: { type: "web_search_begin", call_id: "ws_77" },
        conversationId: "thread-77",
      },
    });

    expect(begin.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(begin.payload.id).toBe("turn-77");
    expect(begin.payload.delta).toBe("");
    expect(begin.payload.runtime_event_method).toBe("codex/event/web_search_begin");

    const end = mapper.map({
      method: "codex/event/web_search_end",
      params: {
        id: "turn-77",
        msg: {
          type: "web_search_end",
          call_id: "ws_77",
          query: "Elon Musk latest news",
        },
        conversationId: "thread-77",
      },
    });

    expect(end.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(end.payload.id).toBe("turn-77");
    expect(end.payload.delta).toBe("");
    expect(end.payload.runtime_event_method).toBe("codex/event/web_search_end");
  });

  it("suppresses empty reasoning item lifecycle events", () => {
    const started = mapper.map({
      method: "item.started",
      params: { item: { id: "reason-1", type: "reasoning", summary: [], content: [] } },
    });
    expect(started.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(started.payload.id).toBe("reason-1");
    expect(started.payload.delta).toBe("");
    expect(started.payload.runtime_event_method).toBe("item/added");

    const completed = mapper.map({
      method: "item.completed",
      params: { item: { id: "reason-1", type: "reasoning", summary: [], content: [] } },
    });
    expect(completed.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(completed.payload.id).toBe("reason-1");
    expect(completed.payload.delta).toBe("");
    expect(completed.payload.runtime_event_method).toBe("item/completed");
  });

  it("maps reasoning summary snapshot from completed item payload", () => {
    const completed = mapper.map({
      method: "item.completed",
      params: {
        item: {
          id: "reason-2",
          type: "reasoning",
          summary: [{ text: "Step 1. Step 2." }],
          content: [],
        },
      },
    });
    expect(completed.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(completed.payload.id).toBe("reason-2");
    expect(completed.payload.delta).toBe("Step 1. Step 2.");
    expect(completed.payload.segment_type).toBe("reasoning");
    expect(completed.payload.runtime_event_method).toBe("item/completed");
  });

  it("suppresses user message lifecycle events", () => {
    const started = mapper.map({
      method: "item.started",
      params: { item: { id: "user-1", type: "userMessage", content: [] } },
    });
    expect(started.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(started.payload.id).toBe("user-1");
    expect(started.payload.delta).toBe("");
  });

  it("maps codex reasoning and plan methods", () => {
    const reasoningDelta = mapper.map({
      method: "item.reasoning.outputDelta",
      params: { itemId: "item-r", delta: "why" },
    });
    expect(reasoningDelta.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(reasoningDelta.payload.id).toBe("item-r");
    expect(reasoningDelta.payload.delta).toBe("why");
    expect(reasoningDelta.payload.segment_type).toBe("reasoning");
    expect(reasoningDelta.payload.runtime_event_method).toBe("item/reasoning/delta");

    const summaryPart = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: { itemId: "item-r", summary_part: "summary" },
    });
    expect(summaryPart.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(summaryPart.payload.runtime_event_method).toBe("item/reasoning/summaryPartAdded");
    expect(summaryPart.payload.delta).toBe("summary");

    const plan = mapper.map({ method: "item/plan/delta", params: { tasks: [] } });
    expect(plan.type).toBe(ServerMessageType.TODO_LIST_UPDATE);
    expect(plan.payload.runtime_event_method).toBe("item/plan/delta");
  });

  it("uses stable reasoning item id instead of per-event envelope id", () => {
    const summaryPart = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-1",
        item: { id: "reason-item-1", type: "reasoning" },
        summary_part: "first summary chunk",
      },
    });
    expect(summaryPart.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(summaryPart.payload.id).toBe("reason-item-1");
    expect(summaryPart.payload.delta).toBe("first summary chunk");

    const completed = mapper.map({
      method: "item/reasoning/completed",
      params: {
        id: "event-2",
        item: { id: "reason-item-1", type: "reasoning", summary: ["full summary"] },
      },
    });
    expect(completed.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(completed.payload.id).toBe("reason-item-1");
    expect(completed.payload.segment_type).toBe("reasoning");
  });

  it("coalesces reasoning chunks by turn id when item ids are absent", () => {
    const first = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-a",
        turnId: "turn-42",
        summary_part: "first",
      },
    });
    expect(first.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(first.payload.id).toBe("event-a");
    expect(first.payload.delta).toBe("first");

    const second = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-b",
        turnId: "turn-42",
        summary_part: "second",
      },
    });
    expect(second.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(second.payload.id).toBe("event-a");
    expect(second.payload.delta).toBe("second");

    const third = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-c",
        turnId: "turn-43",
        summary_part: "third",
      },
    });
    expect(third.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(third.payload.id).toBe("event-c");
    expect(third.payload.delta).toBe("third");
  });

  it("coalesces generic item/delta reasoning chunks by turn id", () => {
    const first = mapper.map({
      method: "item.updated",
      params: {
        id: "event-r1",
        turnId: "turn-r1",
        item: { type: "reasoning" },
        delta: "part-1",
      },
    });
    expect(first.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(first.payload.id).toBe("event-r1");
    expect(first.payload.segment_type).toBe("reasoning");
    expect(first.payload.runtime_event_method).toBe("item/delta");

    const second = mapper.map({
      method: "item.updated",
      params: {
        id: "event-r2",
        turnId: "turn-r1",
        item: { type: "reasoning" },
        delta: "part-2",
      },
    });
    expect(second.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(second.payload.id).toBe("event-r1");
    expect(second.payload.segment_type).toBe("reasoning");
    expect(second.payload.delta).toBe("part-2");
  });

  it("coalesces reasoning chunks by turn id even when item ids differ", () => {
    const first = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-x1",
        turnId: "turn-x",
        item: { id: "reason-item-1", type: "reasoning" },
        summary_part: "first",
      },
    });
    expect(first.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(first.payload.id).toBe("reason-item-1");

    const second = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-x2",
        turnId: "turn-x",
        item: { id: "reason-item-2", type: "reasoning" },
        summary_part: "second",
      },
    });
    expect(second.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(second.payload.id).toBe("reason-item-1");
    expect(second.payload.delta).toBe("second");
  });

  it("resets turn-level reasoning coalescing after turn completion", () => {
    const first = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-d",
        turnId: "turn-99",
        summary_part: "alpha",
      },
    });
    expect(first.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(first.payload.id).toBe("event-d");

    const completedTurn = mapper.map({
      method: "turn/completed",
      params: {
        turnId: "turn-99",
      },
    });
    expect(completedTurn.type).toBe(ServerMessageType.AGENT_STATUS);

    const afterReset = mapper.map({
      method: "item/reasoning/summaryPartAdded",
      params: {
        id: "event-e",
        turnId: "turn-99",
        summary_part: "beta",
      },
    });
    expect(afterReset.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(afterReset.payload.id).toBe("event-e");
    expect(afterReset.payload.delta).toBe("beta");
  });

  it("maps codex command execution methods", () => {
    const started = mapper.map({
      method: "item/command_execution/started",
      params: { invocation_id: "inv-1" },
    });
    expect(started.type).toBe(ServerMessageType.TOOL_EXECUTION_STARTED);
    expect(started.payload.invocation_id).toBe("inv-1");
    expect(started.payload.tool_name).toBe("run_bash");
    expect(started.payload.runtime_event_method).toBe("item/commandExecution/started");

    const delta = mapper.map({
      method: "item.commandExecution.outputDelta",
      params: { invocation_id: "inv-1", chunk: "out" },
    });
    expect(delta.type).toBe(ServerMessageType.TOOL_LOG);
    expect(delta.payload.tool_invocation_id).toBe("inv-1");
    expect(delta.payload.tool_name).toBe("run_bash");
    expect(delta.payload.log_entry).toBe("out");
    expect(delta.payload.runtime_event_method).toBe("item/commandExecution/delta");

    const completedSuccess = mapper.map({
      method: "item/command_execution/completed",
      params: { invocation_id: "inv-1", success: true },
    });
    expect(completedSuccess.type).toBe(ServerMessageType.TOOL_EXECUTION_SUCCEEDED);
    expect(completedSuccess.payload.invocation_id).toBe("inv-1");
    expect(completedSuccess.payload.tool_name).toBe("run_bash");

    const completedFailure = mapper.map({
      method: "item/command_execution/completed",
      params: { invocation_id: "inv-2", success: false },
    });
    expect(completedFailure.type).toBe(ServerMessageType.TOOL_EXECUTION_FAILED);
    expect(completedFailure.payload.invocation_id).toBe("inv-2");
    expect(completedFailure.payload.tool_name).toBe("run_bash");
    expect(completedFailure.payload.error).toBe("Tool execution failed.");
  });

  it("maps codex approval request methods", () => {
    const message = mapper.map({
      method: "item/command_execution/request_approval",
      params: { invocation_id: "inv-1", command: "read_file" },
    });
    expect(message.type).toBe(ServerMessageType.TOOL_APPROVAL_REQUESTED);
    expect(message.payload.invocation_id).toBe("inv-1");
    expect(message.payload.tool_name).toBe("run_bash");
    expect(message.payload.arguments).toEqual({ command: "read_file" });
  });

  it("maps codex file-change approval requests to canonical tool payload", () => {
    const message = mapper.map({
      method: "item/file_change/request_approval",
      params: { itemId: "item-9", approvalId: "approval-1", path: "src/a.ts", patch: "@@..." },
    });
    expect(message.type).toBe(ServerMessageType.TOOL_APPROVAL_REQUESTED);
    expect(message.payload.invocation_id).toBe("item-9:approval-1");
    expect(message.payload.tool_name).toBe("edit_file");
    expect(message.payload.arguments).toEqual({ path: "src/a.ts", patch: "@@..." });
  });

  it("maps codex file-change approval payloads using changes[] when explicit args are empty", () => {
    const message = mapper.map({
      method: "item/file_change/request_approval",
      params: {
        item: {
          id: "call_x",
          type: "file_change_call",
          name: "edit_file",
          changes: [
            {
              path: "temp_workspace/fibonacci.py",
              diff: "@@ -0,0 +1,8 @@\n+print('fib')",
            },
          ],
        },
        arguments: { path: "", patch: "" },
      },
    });

    expect(message.type).toBe(ServerMessageType.TOOL_APPROVAL_REQUESTED);
    expect(message.payload.invocation_id).toBe("call_x");
    expect(message.payload.tool_name).toBe("edit_file");
    expect(message.payload.arguments).toEqual({
      path: "temp_workspace/fibonacci.py",
      patch: "@@ -0,0 +1,8 @@\n+print('fib')",
    });
  });

  it("maps codex file-change segment metadata path from changes[] when metadata/path are empty", () => {
    const added = mapper.map({
      method: "item/added",
      params: {
        metadata: { path: "" },
        item: {
          id: "call_y",
          type: "file_change_call",
          name: "edit_file",
          changes: [{ path: "temp_workspace/fibonacci.py", diff: "@@..." }],
        },
      },
    });

    expect(added.type).toBe(ServerMessageType.SEGMENT_START);
    expect(added.payload.segment_type).toBe("edit_file");
    expect(added.payload.id).toBe("call_y");
    expect(added.payload.metadata?.path).toBe("temp_workspace/fibonacci.py");
    expect(added.payload.metadata?.tool_name).toBe("edit_file");
  });

  it("maps codex file-change segment end metadata path/patch from changes[]", () => {
    const completed = mapper.map({
      method: "item/completed",
      params: {
        item: {
          id: "call_z",
          type: "file_change_call",
          name: "edit_file",
          changes: [
            {
              path: "temp_workspace/fibonacci.py",
              diff: "@@ -0,0 +1,4 @@\n+print('hello')",
            },
          ],
        },
      },
    });

    expect(completed.type).toBe(ServerMessageType.SEGMENT_END);
    expect(completed.payload.id).toBe("call_z");
    expect(completed.payload.segment_type).toBeUndefined();
    expect(completed.payload.metadata?.tool_name).toBe("edit_file");
    expect(completed.payload.metadata?.path).toBe("temp_workspace/fibonacci.py");
    expect(completed.payload.metadata?.patch).toBe("@@ -0,0 +1,4 @@\n+print('hello')");
  });

  it("maps codex command-execution segment end metadata command from item.command", () => {
    const completed = mapper.map({
      method: "item/completed",
      params: {
        item: {
          id: "call_cmd_1",
          type: "commandExecution",
          name: "run_bash",
          command: "/bin/bash -lc 'python fibonacci.py'",
          status: "completed",
        },
      },
    });

    expect(completed.type).toBe(ServerMessageType.SEGMENT_END);
    expect(completed.payload.id).toBe("call_cmd_1");
    expect(completed.payload.metadata?.tool_name).toBe("run_bash");
    expect(completed.payload.metadata?.command).toBe("/bin/bash -lc 'python fibonacci.py'");
  });

  it("maps codex file change and token usage methods", () => {
    const fileDelta = mapper.map({
      method: "item.fileChange.outputDelta",
      params: { path: "/tmp/a.ts", delta: "patch" },
    });
    expect(fileDelta.type).toBe(ServerMessageType.ARTIFACT_UPDATED);
    expect(fileDelta.payload.runtime_event_method).toBe("item/fileChange/delta");

    const fileCompleted = mapper.map({
      method: "item/fileChange/completed",
      params: { path: "/tmp/a.ts" },
    });
    expect(fileCompleted.type).toBe(ServerMessageType.ARTIFACT_PERSISTED);
    expect(fileCompleted.payload.runtime_event_method).toBe("item/fileChange/completed");

    const tokenUsage = mapper.map({
      method: "thread/token_usage/updated",
      params: { total_tokens: 42 },
    });
    expect(tokenUsage.type).toBe(ServerMessageType.AGENT_STATUS);
    expect(tokenUsage.payload.runtime_event_method).toBe("thread/tokenUsage/updated");
  });

  it("returns deterministic non-silent fallback for unknown codex methods", () => {
    const message = mapper.map({
      method: "custom.method",
      params: { foo: "bar" },
    });
    expect(message.type).toBe(ServerMessageType.SEGMENT_CONTENT);
    expect(message.payload.runtime_event_method).toBe("custom/method");
  });

  it("emits runtime-unmapped error when codex event method is missing", () => {
    const message = mapper.map({
      params: { foo: "bar" },
    });
    expect(message.type).toBe(ServerMessageType.ERROR);
    expect(message.payload.code).toBe("RUNTIME_EVENT_UNMAPPED");
  });
});
