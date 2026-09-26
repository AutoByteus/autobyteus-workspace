import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import {
  createSessionHarness,
  eventTypes,
  fixturePath,
  fixtureSessionId,
  readFixture,
  waitFor,
  writeCustomFixture,
  type FixtureRow,
  type SessionHarness,
} from "./acp-fake-agent-harness.js";

const harnesses: SessionHarness[] = [];
const track = (harness: SessionHarness): SessionHarness => { harnesses.push(harness); return harness; };

afterEach(async () => {
  for (const harness of harnesses.splice(0)) {
    harness.session.close();
    await harness.connection.close();
  }
});

const openNew = async (harness: SessionHarness) => {
  await harness.connection.initialize();
  return harness.session.openNew({ cwd: os.tmpdir(), mcpServers: [], _meta: { rules: "rules", yoloMode: false } });
};

const runTurn = async (harness: SessionHarness, turnId = "turn-1") => {
  harness.events.push(...harness.session.startTurn(turnId, [{ type: "text", text: "go" }]));
  await waitFor(() => harness.events.some((event) =>
    event.eventType === AgentRunEventType.TURN_COMPLETED || event.eventType === AgentRunEventType.TURN_INTERRUPTED
    || (event.eventType === AgentRunEventType.ERROR && event.payload.error_scope === "turn")));
};

const usageEvents = (events: AgentRunEvent[]) => events.filter((event) => event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED);

/** A text or reasoning segment is closed before a tool card, usage, or the turn end. */
const assertSegmentBoundaries = (events: AgentRunEvent[]) => {
  let open: string | null = null;
  for (const event of events) {
    const { payload } = event;
    if (event.eventType === AgentRunEventType.SEGMENT_START && (payload.segment_type === "text" || payload.segment_type === "reasoning")) {
      expect(open).toBeNull();
      open = String(payload.id);
    } else if (event.eventType === AgentRunEventType.SEGMENT_END && payload.id === open) {
      open = null;
    } else if (event.eventType === AgentRunEventType.SEGMENT_START
      || event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED
      || event.eventType === AgentRunEventType.TURN_COMPLETED
      || event.eventType === AgentRunEventType.TURN_INTERRUPTED) {
      expect(open).toBeNull();
    }
  }
};

const handshakeRows = (): FixtureRow[] => readFixture("handshake");
const sessionIdOf = (): string => fixtureSessionId("handshake");

describe("AcpAgentSession over recorded Grok traffic", () => {
  it("normalizes a tool-using turn and records one usage entry per model call (AC-003, AC-009)", async () => {
    const harness = track(createSessionHarness({ fixture: fixturePath("prompt") }));
    const opened = await openNew(harness);
    expect(opened.sessionId).toBe(fixtureSessionId("prompt"));
    await runTurn(harness);
    const { events } = harness;

    expect(events[0]).toMatchObject({ eventType: AgentRunEventType.TURN_STARTED, payload: { turn_id: "turn-1" }, statusHint: "ACTIVE" });
    expect(events.at(-1)).toMatchObject({ eventType: AgentRunEventType.TURN_COMPLETED, payload: { turn_id: "turn-1", provider_stop_reason: "end_turn" }, statusHint: "IDLE" });
    assertSegmentBoundaries(events);

    const toolStart = events.find((event) => event.eventType === AgentRunEventType.SEGMENT_START && event.payload.segment_type === "tool_call");
    expect(toolStart?.payload.metadata).toMatchObject({ tool_name: "list_dir", arguments: { target_directory: "/tmp/grok-acp-exp/ws" } });
    const invocationId = toolStart?.payload.id;
    expect(eventTypes(events.filter((event) => event.payload.invocation_id === invocationId)))
      .toEqual([AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED]);
    expect(JSON.stringify(events.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)?.payload.result))
      .toContain("alpha.txt");

    const text = events.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT
      && String(event.payload.id).includes(":text:")).map((event) => event.payload.delta).join("");
    expect(text.startsWith("PINEAPPLE")).toBe(true);
    const allContent = events.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT).map((event) => String(event.payload.delta)).join("");
    expect(allContent).not.toContain("Upgrade");

    const usage = usageEvents(events).map((event) => event.payload);
    expect(usage).toHaveLength(2);
    const sessionId = fixtureSessionId("prompt");
    expect(usage[0]).toMatchObject({
      runtime_kind: "grok_build", ingestion_kind: "grok_acp_call", usage_scope: "per_call",
      idempotency_key: `grok_build:${sessionId}:turn-1:1`, model_provider: "GROK", model_identifier: "grok-4.7",
      input_token_semantic: "base_excludes_cache", reported_input_tokens: 15788, cache_read_input_tokens: 1152,
      cache_creation_input_tokens: 0, reported_output_tokens: 108, reasoning_output_tokens: 84, turn_id: "turn-1",
    });
    expect(usage[1]).toMatchObject({ idempotency_key: `grok_build:${sessionId}:turn-1:2`, reported_input_tokens: 183, cache_read_input_tokens: 16896 });
    const gross = usage.reduce((sum, row) => sum + Number(row.reported_input_tokens) + Number(row.cache_read_input_tokens), 0);
    expect([gross, usage.reduce((sum, row) => sum + Number(row.reported_output_tokens), 0)]).toEqual([34019, 146]);
  });

  it("records four MCP-turn model calls whose sums equal the turn usage", async () => {
    const harness = track(createSessionHarness({ fixture: fixturePath("mcp2") }));
    await openNew(harness);
    await runTurn(harness);
    const usage = usageEvents(harness.events).map((event) => event.payload);
    expect(usage.map((row) => row.call_sequence)).toEqual([1, 2, 3, 4]);
    const sum = (field: string) => usage.reduce((total, row) => total + Number(row[field]), 0);
    expect(sum("reported_input_tokens") + sum("cache_read_input_tokens")).toBe(70034);
    expect([sum("cache_read_input_tokens"), sum("reported_output_tokens"), sum("reasoning_output_tokens")]).toEqual([53504, 345, 209]);
    const toolNames = harness.events.filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)
      .map((event) => event.payload.tool_name);
    expect(toolNames).toEqual(["search_tool", "autobyteus_probe_tools__echo", "autobyteus_probe_tools__get_handoff_rules"]);
    expect(harness.events.find((event) => event.payload.tool_name === "autobyteus_probe_tools__get_handoff_rules"
      && event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)?.payload.result)
      .toEqual({ rules: [{ when: "always", recipient_address: "/probe_reviewer" }] });
  });

  it("asks for approval under the canonical run_bash name and answers allow-once (AC-004)", async () => {
    const recordFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acp-record-")), "client.jsonl");
    const harness = track(createSessionHarness({ fixture: fixturePath("permission"), recordFile }));
    await openNew(harness);
    harness.events.push(...harness.session.startTurn("turn-1", [{ type: "text", text: "go" }]));
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED));
    const request = harness.events.find((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED)!;
    expect(request.payload).toMatchObject({ tool_name: "run_bash", arguments: { command: "echo grok-permission-probe > probe.txt" } });
    const card = harness.events.find((event) => event.eventType === AgentRunEventType.SEGMENT_START && event.payload.id === request.payload.invocation_id);
    expect(card?.payload).toMatchObject({ segment_type: "run_bash", metadata: { tool_name: "run_bash", arguments: { command: "echo grok-permission-probe > probe.txt" } } });

    expect(harness.session.approve(String(request.payload.invocation_id), true, null)).toEqual({ accepted: true });
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    const lifecycle = harness.events.filter((event) => event.payload.invocation_id === request.payload.invocation_id).map((event) => event.eventType);
    expect(lifecycle).toEqual([
      AgentRunEventType.TOOL_APPROVAL_REQUESTED, AgentRunEventType.TOOL_APPROVED,
      AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    ]);
    const answers = fs.readFileSync(recordFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
      .filter((message) => message.result?.outcome);
    expect(answers).toEqual([expect.objectContaining({ result: { outcome: { outcome: "selected", optionId: "allow-once" } } })]);
  });

  it("denies with reject-once and ignores later provider updates for the denied call", async () => {
    const recordFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acp-record-")), "client.jsonl");
    const harness = track(createSessionHarness({ fixture: fixturePath("permission"), recordFile }));
    await openNew(harness);
    harness.events.push(...harness.session.startTurn("turn-1", [{ type: "text", text: "go" }]));
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED));
    const invocationId = String(harness.events.find((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED)!.payload.invocation_id);
    harness.session.approve(invocationId, false, "not now");
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    const lifecycle = harness.events.filter((event) => event.payload.invocation_id === invocationId).map((event) => event.eventType);
    expect(lifecycle).toEqual([AgentRunEventType.TOOL_APPROVAL_REQUESTED, AgentRunEventType.TOOL_DENIED]);
    expect(fs.readFileSync(recordFile, "utf8")).toContain('"optionId":"reject-once"');
    expect(harness.session.approve(invocationId, true, null)).toMatchObject({ accepted: false, code: "TOOL_APPROVAL_NOT_PENDING" });
  });

  it("auto-approves permission requests once when auto-execute is on", async () => {
    const recordFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acp-record-")), "client.jsonl");
    const harness = track(createSessionHarness({ fixture: fixturePath("permission"), recordFile, autoExecuteTools: true }));
    await openNew(harness);
    await runTurn(harness);
    expect(eventTypes(harness.events)).not.toContain(AgentRunEventType.TOOL_APPROVAL_REQUESTED);
    expect(harness.events.find((event) => event.eventType === AgentRunEventType.TOOL_APPROVED)?.payload.reason).toBe("auto_execute_tools_enabled");
    expect(fs.readFileSync(recordFile, "utf8")).toContain('"optionId":"allow-once"');
  });

  it("discards history replayed by session/load and resumes the same session (AC-006)", async () => {
    const harness = track(createSessionHarness({ fixture: fixturePath("load") }));
    await harness.connection.initialize();
    const sessionId = fixtureSessionId("load");
    await harness.session.openLoad({ sessionId, cwd: os.tmpdir(), mcpServers: [] });
    expect(harness.session.sessionId).toBe(sessionId);
    expect(harness.events).toEqual([]);
    await runTurn(harness);
    const rows = readFixture("load");
    const promptIndex = rows.findIndex((row) => row.dir === "out" && row.msg.method === "session/prompt");
    const liveCalls = rows.slice(promptIndex).filter((row) => row.msg.params?.update?.sessionUpdate === "response_completed").length;
    expect(usageEvents(harness.events)).toHaveLength(liveCalls);
    expect(harness.events.some((event) => event.eventType === AgentRunEventType.SEGMENT_START && event.payload.segment_type === "tool_call")).toBe(false);
  });

  it("cancels the active turn and reports it interrupted with the session reusable (AC-008)", async () => {
    const harness = track(createSessionHarness({ fixture: fixturePath("cancel") }));
    await openNew(harness);
    harness.events.push(...harness.session.startTurn("turn-1", [{ type: "text", text: "go" }]));
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT));
    expect(await harness.session.cancel("turn-1")).toBe(true);
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.TURN_INTERRUPTED));
    assertSegmentBoundaries(harness.events);
    expect(usageEvents(harness.events)).toEqual([]);
    expect(harness.session.state).toBe("ready");
    expect(harness.session.activeTurnId).toBeNull();
    expect(await harness.session.cancel("turn-1")).toBe(false);
  });

  it("waits for Agent Tools MCP readiness, including status buffered before session/new returns", async () => {
    const rows = handshakeRows();
    const responseIndex = rows.findIndex((row) => row.dir === "in" && row.msg.result?.sessionId);
    const status = (name: string, value: string): FixtureRow => ({ dir: "in", msg: {
      jsonrpc: "2.0", method: "_x.ai/mcp/server_status", params: { sessionId: sessionIdOf(), name, status: value, reason: "x" } } });
    const early = [...rows.slice(0, responseIndex), status("autobyteus_agent_tools", "ready"), ...rows.slice(responseIndex)];
    const harness = track(createSessionHarness({ fixture: writeCustomFixture(early) }));
    await openNew(harness);
    await expect(harness.session.awaitMcpServerReady({ serverName: "autobyteus_agent_tools", timeoutMs: 1_000 })).resolves.toBeUndefined();
  });

  it("fails activation explicitly when the MCP server is unavailable (AC-005 alternate)", async () => {
    const unavailable = [...handshakeRows(), { dir: "in" as const, msg: {
      jsonrpc: "2.0", method: "_x.ai/mcp/server_status",
      params: { sessionId: sessionIdOf(), name: "autobyteus_agent_tools", status: "unavailable", reason: "handshake_failed", detail: "secret http://127.0.0.1" } } }];
    const harness = track(createSessionHarness({ fixture: writeCustomFixture(unavailable) }));
    await openNew(harness);
    const error = await harness.session.awaitMcpServerReady({ serverName: "autobyteus_agent_tools", timeoutMs: 2_000 }).catch((caught) => caught as Error);
    expect(error.message).toContain("'autobyteus_agent_tools' unavailable");
    expect(error.message).not.toContain("127.0.0.1");
  });

  it("times out MCP readiness when the agent never reports the server", async () => {
    const harness = track(createSessionHarness({ fixture: fixturePath("handshake") }));
    await openNew(harness);
    await expect(harness.session.awaitMcpServerReady({ serverName: "autobyteus_agent_tools", timeoutMs: 50 }))
      .rejects.toThrow("ACP_MCP_SERVER_NOT_READY");
  });

  it("turns an agent exit mid-turn into an interrupted turn plus a runtime error (QR-006)", async () => {
    const rows = readFixture("prompt");
    const firstTool = rows.findIndex((row) => row.msg.params?.update?.sessionUpdate === "tool_call");
    const harness = track(createSessionHarness({ fixture: writeCustomFixture(rows.slice(0, firstTool + 1)), exitAtEnd: true }));
    await openNew(harness);
    harness.events.push(...harness.session.startTurn("turn-1", [{ type: "text", text: "go" }]));
    await waitFor(() => harness.failures.length > 0);
    const tail = eventTypes(harness.events).slice(-3);
    expect(tail).toEqual([AgentRunEventType.TOOL_EXECUTION_INTERRUPTED, AgentRunEventType.TURN_INTERRUPTED, AgentRunEventType.ERROR]);
    expect(harness.events.at(-1)?.payload).toMatchObject({ error_scope: "runtime", error_effect: "terminal" });
    // Stdout may close before the exit event; both report the stopped agent.
    expect(String(harness.events.at(-1)?.payload.code)).toMatch(/^ACP_(AGENT_PROCESS_EXITED|TRANSPORT_CLOSED)$/);
    expect(harness.session.state).toBe("failed");
  });

  it("fails an idle turn but not while a tool call is pending", async () => {
    const promptRows: FixtureRow[] = [...handshakeRows(), { dir: "out", msg: { jsonrpc: "2.0", id: 99, method: "session/prompt" } }];
    const idle = track(createSessionHarness({ fixture: writeCustomFixture(promptRows), idleTimeoutMs: 100 }));
    await openNew(idle);
    idle.events.push(...idle.session.startTurn("turn-1", [{ type: "text", text: "go" }]));
    await waitFor(() => idle.failures.length > 0);
    expect(idle.failures[0]?.code).toBe("ACP_TURN_IDLE_TIMEOUT");

    const pendingTool: FixtureRow = { dir: "in", msg: { jsonrpc: "2.0", method: "session/update", params: {
      sessionId: sessionIdOf(), update: { sessionUpdate: "tool_call", toolCallId: "call-1", title: "run_terminal_command",
        rawInput: { command: "sleep 600" }, _meta: { "x.ai/tool": { name: "run_terminal_command" } } } } } };
    const busy = track(createSessionHarness({ fixture: writeCustomFixture([...promptRows, pendingTool]), idleTimeoutMs: 100 }));
    await openNew(busy);
    busy.events.push(...busy.session.startTurn("turn-1", [{ type: "text", text: "go" }]));
    await waitFor(() => busy.events.some((event) => event.eventType === AgentRunEventType.SEGMENT_START && event.payload.segment_type === "run_bash"));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(busy.failures).toEqual([]);
  });
});
