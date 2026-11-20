import { describe, expect, it } from "vitest";
import { grokBuildSessionProfile } from "../../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import { GROK_PROVIDER_TURN_NOTICE_SENDER_ID } from "../../../../../src/agent-execution/domain/system-task-notification-senders.js";
import { readFixture } from "../acp/acp-fake-agent-harness.js";

const context = { sessionId: "s-1", turnId: "t-1", callOrdinal: 3, model: "grok-4.7" };

describe("grokBuildSessionProfile", () => {
  it("injects the composed prompt as rules and mirrors auto-execute as yoloMode, nothing else", () => {
    expect(grokBuildSessionProfile.newSessionMeta({ composedPrompt: "You are X", autoExecuteTools: true }))
      .toEqual({ rules: "You are X", yoloMode: true });
  });

  it("always attaches Agent Tools MCP over HTTP, even with an empty list, and requires its readiness", () => {
    const descriptor = { name: "autobyteus_agent_tools" as const, transport: "streamable_http" as const, serverUrl: "http://h/mcp", enabledTools: [] };
    expect(grokBuildSessionProfile.mcpServers(descriptor)).toEqual([{ type: "http", name: "autobyteus_agent_tools", url: "http://h/mcp", headers: [] }]);
    expect(grokBuildSessionProfile.mcpReadiness(descriptor)).toEqual({ serverName: "autobyteus_agent_tools", timeoutMs: 15_000 });
  });

  it("turns response_completed into one per-call usage payload, reports its prompt's signals, and ignores turn totals and bookkeeping", () => {
    const all = readFixture("prompt").filter((row) => row.dir === "in" && typeof row.msg.method === "string" && row.msg.method.startsWith("_x.ai/"))
      .flatMap((row) => grokBuildSessionProfile.interpretExtNotification(row.msg.method, row.msg.params, context));
    // The client prompt's own signals (autobyteus-517): the session takes them as the input prompt's id and its end.
    expect(all.map((effect) => effect.kind)).toEqual(["prompt_running", "usage", "usage", "prompt_completed"]);
    expect(all[0]).toMatchObject({ kind: "prompt_running", promptId: "17b384a6-9ff9-4855-adb3-6071c8ae08d1" });
    expect(all[3]).toEqual({ kind: "prompt_completed", promptId: "17b384a6-9ff9-4855-adb3-6071c8ae08d1", stopReason: "end_turn" });
    const effects = all.filter((effect) => effect.kind === "usage");
    expect(effects[0]).toEqual({ kind: "usage", payload: expect.objectContaining({
      idempotency_key: "grok_build:s-1:t-1:3", call_sequence: 3, usage_scope: "per_call", input_token_semantic: "base_excludes_cache",
      reported_input_tokens: 15788, cache_read_input_tokens: 1152, cache_creation_input_tokens: 0,
      reported_output_tokens: 108, reasoning_output_tokens: 84, reported_total_tokens: 15788 + 1152 + 108,
      cache_state: "positive", model_provider: "GROK", model_identifier: "grok-4.7", runtime_kind: "grok_build",
    }) });
  });

  it("reports MCP server readiness and unavailability", () => {
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/mcp/server_status",
      { sessionId: "s-1", name: "autobyteus_agent_tools", status: "ready", reason: "initialized" }, context))
      .toEqual([{ kind: "mcp_status", server: "autobyteus_agent_tools", status: "ready", detail: "initialized" }]);
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/mcp/server_status",
      { sessionId: "s-1", name: "autobyteus_agent_tools", status: "unavailable", reason: "handshake_failed" }, context)[0])
      .toMatchObject({ status: "unavailable" });
  });

  describe("prompt signals (autobyteus-517, probe frames)", () => {
    const reminder = "<system-reminder>\nBackground task \"f60f\" completed (exit code: 0).\nUse get_command_or_subagent_output(\"f60f\") to see the full output.\n</system-reminder>";

    it("reads a running prompt Grok queued itself, with its reminder text without the wrapper as the notice", () => {
      expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/queue/changed", { sessionId: "s-1", entries: [],
        runningPromptId: "task-completed-f60f", runningText: reminder, runningKind: "prompt" }, context)).toEqual([{
        kind: "prompt_running", promptId: "task-completed-f60f", notice: {
          content: "Background task \"f60f\" completed (exit code: 0).\nUse get_command_or_subagent_output(\"f60f\") to see the full output.",
          senderId: GROK_PROVIDER_TURN_NOTICE_SENDER_ID,
        },
      }]);
    });

    it("keeps text without a wrapper as it is, and gives no notice without text", () => {
      expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/queue/changed",
        { sessionId: "s-1", runningPromptId: "p-1", runningText: "  Run the suite.  " }, context))
        .toEqual([{ kind: "prompt_running", promptId: "p-1", notice: { content: "Run the suite.", senderId: GROK_PROVIDER_TURN_NOTICE_SENDER_ID } }]);
      expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/queue/changed",
        { sessionId: "s-1", runningPromptId: "p-2", runningText: "<system-reminder>\n</system-reminder>" }, context))
        .toEqual([{ kind: "prompt_running", promptId: "p-2", notice: null }]);
    });

    it("reports nothing for a queue without a running prompt", () => {
      expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/queue/changed", { sessionId: "s-1", entries: [] }, context)).toEqual([]);
      expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/queue/changed",
        { sessionId: "s-1", entries: [{ id: "x", kind: "prompt", text: "queued" }] }, context)).toEqual([]);
    });

    it("reads turn_completed as the prompt's end, cancelled included, and ignores one without prompt id or stop reason", () => {
      const completed = (update: Record<string, unknown>) => grokBuildSessionProfile.interpretExtNotification("_x.ai/session_notification",
        { sessionId: "s-1", update: { sessionUpdate: "turn_completed", ...update } }, context);
      expect(completed({ prompt_id: "task-completed-f60f", stop_reason: "cancelled" }))
        .toEqual([{ kind: "prompt_completed", promptId: "task-completed-f60f", stopReason: "cancelled" }]);
      expect(completed({ stop_reason: "end_turn" })).toEqual([]);
      expect(completed({ prompt_id: "p-1" })).toEqual([]);
    });
  });

  it("ignores unknown or malformed extension traffic (QR-005)", () => {
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/brand_new", { anything: 1 }, context)).toEqual([]);
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/session_notification",
      { update: { sessionUpdate: "response_completed", usage: { input_tokens: "x" } } }, context)).toEqual([]);
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/session_notification",
      { update: { sessionUpdate: "response_completed", usage: { input_tokens: 1, output_tokens: 1 } } }, { ...context, turnId: null })).toEqual([]);
  });
});
