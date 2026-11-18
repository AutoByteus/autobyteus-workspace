import { afterEach, describe, expect, it } from "vitest";
import type { SessionConfigOption } from "@agentclientprotocol/sdk";
import type { AcpToolCallSnapshot } from "../../../../../src/agent-execution/backends/acp/acp-agent-session-profile.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import {
  deepSeekHarnessConfigSelection,
  deepSeekHarnessSessionProfile,
} from "../../../../../src/agent-execution/backends/deepseek-harness/deepseek-harness-session-profile.js";
import { projectDeepSeekHarnessToolCall } from "../../../../../src/agent-execution/backends/deepseek-harness/deepseek-harness-tool-projection.js";
import { interpretDeepSeekHarnessProviderCall } from "../../../../../src/agent-execution/backends/deepseek-harness/deepseek-harness-provider-calls.js";
import {
  createSessionHarness,
  waitFor,
  writeCustomFixture,
  type SessionHarness,
} from "../acp/acp-fake-agent-harness.js";
import { DSH_CONFIG_OPTIONS, DSH_SESSION_ID, dshRunRows } from "./dsh-fake-fixtures.js";

const snapshot = (overrides: Partial<AcpToolCallSnapshot>): AcpToolCallSnapshot => ({
  toolCallId: "call-1", title: null, kind: "other", status: "in_progress", rawInput: {}, rawOutput: undefined,
  content: [], locations: [], meta: null, ...overrides,
});
const text = (value: string) => [{ type: "content", content: { type: "text", text: value } }];

const CONTEXT = { sessionId: "s-1", turnId: "turn-1", callOrdinal: 3, model: "deepseek-v4-flash" };

describe("dsh tool projection (REQ-002, REQ-008)", () => {
  it("shows bash as run_bash with its output, and a non-zero `[exit code: N]` as the failure", () => {
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "bash", rawInput: { command: "ls", description: "List" } })))
      .toEqual({ toolName: "run_bash", segmentType: "run_bash", arguments: { command: "ls" } });
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "bash", status: "completed", rawInput: { command: "ls" }, content: text("a.txt\n") })))
      .toMatchObject({ result: "a.txt\n" });
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "bash", status: "completed", rawInput: { command: "false" }, content: text("oops\n[exit code: 1]") })))
      .toMatchObject({ error: "oops\nExit code: 1" });
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "bash", status: "failed", rawInput: { command: "x" }, content: text("Error: the user rejected escalating") })))
      .toMatchObject({ error: "Error: the user rejected escalating\nExit code: unknown" });
  });

  it("shows write, edit and apply_patch as file tools and Agent Tools under their AutoByteus names", () => {
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "write", rawInput: { file_path: "a.txt", content: "hi" } })))
      .toMatchObject({ toolName: "write_file", arguments: { file_path: "a.txt", content: "hi" } });
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "apply_patch", rawInput: { patch: "*** Begin" } })).toolName).toBe("edit_file");
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "edit", rawInput: { file_path: "a.txt", old_string: "a", new_string: "b" } })).toolName).toBe("edit_file");
    expect(projectDeepSeekHarnessToolCall(snapshot({
      title: "mcp__autobyteus_agent_tools__send_message_to", status: "completed", rawInput: { recipient_address: "/a" }, content: text("Delivered."),
    }))).toMatchObject({ toolName: "send_message_to", arguments: { recipient_address: "/a" }, result: "Delivered." });
    expect(projectDeepSeekHarnessToolCall(snapshot({ title: "read", status: "completed", rawInput: { file_path: "a" }, content: text("1: x") })))
      .toEqual({ toolName: "read", segmentType: "tool_call", arguments: { file_path: "a" }, result: "1: x" });
  });
});

describe("dsh config selection (AC-005)", () => {
  it("selects the model, then the effort, by dsh's own option values", () => {
    expect(deepSeekHarnessConfigSelection({ model: "deepseek-v4-pro", reasoningEffort: "low" }, DSH_CONFIG_OPTIONS as SessionConfigOption[]))
      .toEqual([
        { configId: "model", value: "[\"deepseek-official\",\"deepseek-v4-pro\"]" },
        { configId: "reasoning_effort", value: "low" },
      ]);
    expect(deepSeekHarnessConfigSelection({ model: "unknown-model", reasoningEffort: null }, DSH_CONFIG_OPTIONS as SessionConfigOption[]))
      .toEqual([{ configId: "model", value: "[\"deepseek-official\",\"unknown-model\"]" }]);
    expect(deepSeekHarnessConfigSelection({ model: null, reasoningEffort: null }, [])).toEqual([]);
  });
});

describe("dsh provider-call effects (DS-003)", () => {
  const usage = { inputTokens: 100, outputTokens: 20, cacheReadInputTokens: 50, cacheCreationInputTokens: null };

  it("keeps the turn alive on every report and records each finished call's usage (AC-011, AC-012)", () => {
    expect(interpretDeepSeekHarnessProviderCall({ kind: "started", callId: "c", purpose: "turn" }, CONTEXT)).toEqual([{ kind: "activity" }]);
    expect(interpretDeepSeekHarnessProviderCall({ kind: "activity", callId: "c" }, CONTEXT)).toEqual([{ kind: "activity" }]);
    const finished = interpretDeepSeekHarnessProviderCall(
      { kind: "finished", callId: "c", purpose: "turn", httpStatus: 200, stopReason: "end_turn", usage }, CONTEXT);
    expect(finished).toEqual([
      { kind: "usage", payload: expect.objectContaining({
        idempotency_key: "deepseek_harness:s-1:turn-1:3", ingestion_kind: "deepseek_harness_call", model_provider: "DEEPSEEK",
        reported_input_tokens: 100, reported_output_tokens: 20, cache_read_input_tokens: 50, cache_creation_input_tokens: null,
        reported_total_tokens: 170, latest_prompt_tokens: 150, reports_model_call: true, call_sequence: 3,
      }) },
      { kind: "activity" },
    ]);
    expect(interpretDeepSeekHarnessProviderCall(
      { kind: "finished", callId: "c", purpose: "turn", httpStatus: 401, stopReason: null, usage: null }, CONTEXT)).toEqual([{ kind: "activity" }]);
  });

  it("makes a compaction call a provider compaction: completed only when DeepSeek answered it to its end (AC-010)", () => {
    expect(interpretDeepSeekHarnessProviderCall({ kind: "started", callId: "k", purpose: "compaction" }, CONTEXT)[0])
      .toEqual({ kind: "compaction", phase: "started", eventId: "k", details: {} });
    const completed = interpretDeepSeekHarnessProviderCall(
      { kind: "finished", callId: "k", purpose: "compaction", httpStatus: 200, stopReason: "end_turn", usage }, CONTEXT);
    expect(completed.map((effect) => effect.kind)).toEqual(["usage", "compaction", "activity"]);
    expect(completed[1]).toMatchObject({ phase: "completed", eventId: "k" });
    const failed = interpretDeepSeekHarnessProviderCall(
      { kind: "finished", callId: "k", purpose: "compaction", httpStatus: 500, stopReason: null, usage: null }, CONTEXT);
    expect(failed[0]).toMatchObject({ kind: "compaction", phase: "failed" });
    expect(deepSeekHarnessSessionProfile.buildCompactionStatusPayload!({
      sessionId: "s-1", turnId: "turn-1", phase: "failed", operationId: "k", eventId: "k",
      details: (failed[0] as { details: Record<string, unknown> }).details, trigger: "auto", reason: null,
    })).toMatchObject({ status: "failed", rotation_eligible: false, error_message: "DeepSeek did not complete the compaction call (HTTP 500)." });
  });
});

describe("turn liveness from the relay (REQ-012)", () => {
  const harnesses: SessionHarness[] = [];
  afterEach(async () => { for (const harness of harnesses.splice(0)) { harness.session.close(); await harness.connection.close(); } });

  const openedHarness = async () => {
    const harness = createSessionHarness({
      fixture: writeCustomFixture(dshRunRows({ mode: "new", configs: 0 })), profile: deepSeekHarnessSessionProfile, idleTimeoutMs: 150,
    });
    harnesses.push(harness);
    await harness.connection.initialize();
    await harness.session.openNew({ cwd: "/tmp", mcpServers: [] });
    harness.events.push(...harness.session.startTurn("turn-1", [{ type: "text", text: "think hard" }]));
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT));
    return harness;
  };

  it("is not failed for idleness while the model streams, and fails with ACP_TURN_IDLE_TIMEOUT once the stream stops (AC-012)", async () => {
    const harness = await openedHarness();
    expect(harness.session.sessionId).toBe(DSH_SESSION_ID);
    for (let step = 0; step < 6; step += 1) {
      await new Promise((resolve) => setTimeout(resolve, 75));
      harness.session.onProviderCall({ kind: "activity", callId: "c-1" });
    }
    expect(harness.failures).toEqual([]);
    await waitFor(() => harness.failures.length > 0);
    expect(harness.failures[0]?.code).toBe("ACP_TURN_IDLE_TIMEOUT");
  });

  it("drops provider-call effects outside a turn", async () => {
    const harness = await openedHarness();
    harness.session.close();
    const before = harness.events.length;
    harness.session.onProviderCall({ kind: "finished", callId: "c", purpose: "turn", httpStatus: 200, stopReason: "end_turn",
      usage: { inputTokens: 1, outputTokens: 1, cacheReadInputTokens: null, cacheCreationInputTokens: null } });
    expect(harness.events.length).toBe(before);
  });
});
