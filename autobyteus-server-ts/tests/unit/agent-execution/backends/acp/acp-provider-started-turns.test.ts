import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { GROK_PROVIDER_TURN_NOTICE_SENDER_ID } from "../../../../../src/agent-execution/domain/system-task-notification-senders.js";
import { deepSeekHarnessSessionProfile } from "../../../../../src/agent-execution/backends/deepseek-harness/deepseek-harness-session-profile.js";
import {
  createSessionHarness,
  eventTypes,
  fixtureSessionId,
  readFixture,
  waitFor,
  writeCustomFixture,
  type FixtureRow,
  type SessionHarness,
} from "./acp-fake-agent-harness.js";

/**
 * Provider-started turns (autobyteus-517 round 3): a turn Grok Build starts itself, after a background command ended.
 * The frame orders replay the probes (`tickets/…/grok-self-started-turns-517/evidence/grok-acp-probe*.jsonl`):
 * probe 1, a wake after the input turn ended; probe 2 A, a job ending during an input turn (frames 211-215: the input
 * prompt's `turn_completed`, Grok's queued prompt running, `prompt_complete`, then the `session/prompt` response);
 * probe 2 B, a cancelled provider prompt.
 */
const SID = fixtureSessionId("handshake");
const INPUT_PROMPT = "88760ec8-d01e-4f53-8ad5-fd54f3a1b947";
const WAKE = "task-completed-f60f2c3b-fbd0-4e61-8d85-01ffebf0ed56";
const REMINDER = "<system-reminder>\nBackground task \"f60f2c3b\" completed (exit code: 0).\nDescription: Run job.sh in the background | Duration: 60.1s\nUse get_command_or_subagent_output(\"f60f2c3b\") to see the full output.\n</system-reminder>";
const NOTICE = REMINDER.replace("<system-reminder>", "").replace("</system-reminder>", "").trim();

const ext = (method: string, params: Record<string, unknown>): FixtureRow =>
  ({ dir: "in", msg: { jsonrpc: "2.0", method, params: { sessionId: SID, ...params } } });
const running = (promptId: string, text: string): FixtureRow =>
  ext("_x.ai/queue/changed", { entries: [], runningPromptId: promptId, runningText: text, runningKind: "prompt" });
const queueEmpty = (): FixtureRow => ext("_x.ai/queue/changed", { entries: [] });
const turnCompleted = (promptId: string, stopReason: string): FixtureRow =>
  ext("_x.ai/session_notification", { update: { sessionUpdate: "turn_completed", prompt_id: promptId, stop_reason: stopReason } });
const promptComplete = (promptId: string, stopReason: string): FixtureRow =>
  ext("_x.ai/session/prompt_complete", { promptId, stopReason, agentResult: null });
const usage = (): FixtureRow => ext("_x.ai/session_notification", { update: { sessionUpdate: "response_completed",
  usage: { input_tokens: 15931, output_tokens: 99, cache_read_input_tokens: 2176, cache_creation_input_tokens: 0, reasoning_tokens: 98 } } });
const update = (value: Record<string, unknown>): FixtureRow =>
  ({ dir: "in", msg: { jsonrpc: "2.0", method: "session/update", params: { sessionId: SID, update: value } } });
const thought = (text: string, promptId: string) => update({ sessionUpdate: "agent_thought_chunk", content: { type: "text", text }, _meta: { promptId } });
const message = (text: string, promptId: string) => update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text }, _meta: { promptId } });
const toolCall = (toolCallId: string) => update({ sessionUpdate: "tool_call", toolCallId, title: "read_file", status: "in_progress",
  rawInput: { target_file: "out.log" }, _meta: { "x.ai/tool": { name: "read_file" } } });
const toolDone = (toolCallId: string) => update({ sessionUpdate: "tool_call_update", toolCallId, status: "completed", rawOutput: "done" });
const promptRequest = (id: number): FixtureRow => ({ dir: "out", msg: { jsonrpc: "2.0", id, method: "session/prompt" } });
const promptResult = (id: number, stopReason: string): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", id, result: { stopReason } } });
const cancelRequest: FixtureRow = { dir: "out", msg: { jsonrpc: "2.0", method: "session/cancel" } };

/** Probe 1: an input turn that ends with Grok's own prompt end before the response. */
const inputTurn = (id = 99): FixtureRow[] => [promptRequest(id), running(INPUT_PROMPT, "go"), message("STARTED", INPUT_PROMPT),
  queueEmpty(), turnCompleted(INPUT_PROMPT, "end_turn"), promptComplete(INPUT_PROMPT, "end_turn"), promptResult(id, "end_turn")];
/** Probe 1 after the job ended: Grok's own prompt with reasoning, a tool call, text, usage and its end. */
const providerTurn = (promptId = WAKE): FixtureRow[] => [queueEmpty(), running(promptId, REMINDER),
  thought("The job finished.", promptId), toolCall("call-1"), toolDone("call-1"), message("FINISHED", promptId), usage(),
  turnCompleted(promptId, "end_turn")];

const harnesses: SessionHarness[] = [];
const start = async (rows: FixtureRow[], options: { profile?: typeof deepSeekHarnessSessionProfile; idleTimeoutMs?: number } = {}) => {
  const harness = createSessionHarness({ fixture: writeCustomFixture([...readFixture("handshake"), ...rows]), ...options });
  harnesses.push(harness);
  await harness.connection.initialize();
  await harness.session.openNew({ cwd: os.tmpdir(), mcpServers: [], _meta: { rules: "rules", yoloMode: false } });
  return harness;
};
const sendInput = (harness: SessionHarness, turnId = "turn-1") =>
  harness.events.push(...harness.session.startTurn(turnId, [{ type: "text", text: "go" }]));
const ended = (events: AgentRunEvent[], turnId: string) => events.some((event) =>
  (event.eventType === AgentRunEventType.TURN_COMPLETED || event.eventType === AgentRunEventType.TURN_INTERRUPTED) && event.payload.turn_id === turnId);
const providerTurnId = (harness: SessionHarness): string => String(harness.events.find((event) =>
  event.eventType === AgentRunEventType.TURN_STARTED && event.payload.turn_id !== "turn-1")?.payload.turn_id);
const ofTurn = (events: AgentRunEvent[], turnId: string) => events.filter((event) => event.payload.turn_id === turnId);

afterEach(async () => {
  for (const harness of harnesses.splice(0)) {
    harness.session.close();
    await harness.connection.close();
  }
});

describe("AcpAgentSession provider-started turns (Grok Build, autobyteus-517)", () => {
  it("opens a provider turn when Grok starts a prompt while idle: notice, content, tool card, usage, end (AC-001, probe 1)", async () => {
    // A finished tool's late update arrives before the wake, outside any turn: dropped (probe 1, frame 148).
    const harness = await start([...inputTurn(), toolDone("call-0"), ...providerTurn()]);
    sendInput(harness);
    await waitFor(() => harness.events.filter((event) => event.eventType === AgentRunEventType.TURN_COMPLETED).length === 2);

    const turnId = providerTurnId(harness);
    expect(turnId).toMatch(/^[0-9a-f-]{36}$/);
    const startBatch = harness.batches.find((batch) => batch[0]?.eventType === AgentRunEventType.TURN_STARTED && batch[0].payload.turn_id === turnId)!;
    expect(startBatch).toEqual([
      expect.objectContaining({ eventType: AgentRunEventType.TURN_STARTED, statusHint: "ACTIVE", payload: { turn_id: turnId } }),
      expect.objectContaining({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, payload: {
        turn_id: turnId, sender_id: GROK_PROVIDER_TURN_NOTICE_SENDER_ID, content: NOTICE, message_id: expect.any(String) } }),
    ]);
    expect(NOTICE.startsWith("Background task \"f60f2c3b\" completed (exit code: 0).")).toBe(true);

    const turn = ofTurn(harness.events, turnId);
    const types = eventTypes(turn);
    expect(types).toContain(AgentRunEventType.SEGMENT_CONTENT);
    expect(turn.some((event) => event.eventType === AgentRunEventType.SEGMENT_START && event.payload.segment_type === "tool_call")).toBe(true);
    expect(types).toContain(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
    expect(turn.find((event) => event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED)?.payload).toMatchObject({ turn_id: turnId });
    expect(turn.at(-1)).toMatchObject({ eventType: AgentRunEventType.TURN_COMPLETED, statusHint: "IDLE",
      payload: { turn_id: turnId, provider_stop_reason: "end_turn" } });
    const text = turn.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT).map((event) => event.payload.delta).join("");
    expect(text).toContain("FINISHED");
    // Nothing of the input turn leaks into the provider turn, and the late update made no card.
    expect(harness.events.filter((event) => event.payload.invocation_id === "call-0")).toEqual([]);
    expect(harness.session.state).toBe("ready");
    expect(harness.session.activeTurnId).toBeNull();
  });

  it("hands an input turn over to Grok's queued prompt in one batch and stays prompting (AC-006, probe 2 A)", async () => {
    const harness = await start([promptRequest(99), running(INPUT_PROMPT, "go"), message("working", INPUT_PROMPT),
      // The job ends during the input turn: Grok reports the input prompt again (frame 170) and injects nothing.
      running(INPUT_PROMPT, "go"),
      queueEmpty(), turnCompleted(INPUT_PROMPT, "end_turn"), running(WAKE, REMINDER), promptComplete(INPUT_PROMPT, "end_turn"),
      promptResult(99, "end_turn"),
      // The provider prompt's content follows the response (t=61.2 after 60.0).
      thought("noticed", WAKE), message("NOTICED", WAKE), turnCompleted(WAKE, "end_turn")]);
    sendInput(harness);
    await waitFor(() => ended(harness.events, "turn-1"));

    const turnId = providerTurnId(harness);
    const handOver = harness.batches.find((batch) => batch.some((event) =>
      event.eventType === AgentRunEventType.TURN_COMPLETED && event.payload.turn_id === "turn-1"))!;
    expect(eventTypes(handOver).slice(-3)).toEqual([
      AgentRunEventType.TURN_COMPLETED, AgentRunEventType.TURN_STARTED, AgentRunEventType.SYSTEM_TASK_NOTIFICATION]);
    expect(handOver.at(-2)?.payload.turn_id).toBe(turnId);
    expect(handOver.at(-1)?.payload).toMatchObject({ turn_id: turnId, content: NOTICE });

    await waitFor(() => ended(harness.events, turnId));
    const turn = ofTurn(harness.events, turnId);
    expect(turn.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT).map((event) => event.payload.delta).join(""))
      .toContain("NOTICED");
    expect(turn.at(-1)).toMatchObject({ eventType: AgentRunEventType.TURN_COMPLETED, payload: { turn_id: turnId } });
    // Exactly the two turns: the input prompt's repeated running signal opened nothing.
    expect(harness.events.filter((event) => event.eventType === AgentRunEventType.TURN_STARTED)).toHaveLength(2);
    expect(harness.session.state).toBe("ready");
  });

  it("is busy with the provider turn right after the hand-over: no second input turn can start", async () => {
    const harness = await start([promptRequest(99), running(INPUT_PROMPT, "go"), turnCompleted(INPUT_PROMPT, "end_turn"),
      running(WAKE, REMINDER), promptResult(99, "end_turn")]);
    sendInput(harness);
    await waitFor(() => ended(harness.events, "turn-1"));
    expect(harness.session.state).toBe("prompting");
    expect(harness.session.activeTurnId).toBe(providerTurnId(harness));
    expect(() => harness.session.startTurn("turn-2", [{ type: "text", text: "held" }])).toThrow(/ACP_SESSION_NOT_READY/);
  });

  it("ignores another prompt that runs before the input prompt completed (Grok runs one prompt at a time)", async () => {
    const harness = await start([promptRequest(99), running(INPUT_PROMPT, "go"), running(WAKE, REMINDER),
      turnCompleted(INPUT_PROMPT, "end_turn"), promptResult(99, "end_turn")]);
    sendInput(harness);
    await waitFor(() => ended(harness.events, "turn-1"));
    expect(eventTypes(harness.events).filter((type) => type === AgentRunEventType.TURN_STARTED)).toHaveLength(1);
    expect(harness.session.state).toBe("ready");
  });

  it("drops a pending prompt that ended before the input prompt's response", async () => {
    const harness = await start([promptRequest(99), running(INPUT_PROMPT, "go"), turnCompleted(INPUT_PROMPT, "end_turn"),
      running(WAKE, REMINDER), turnCompleted(WAKE, "end_turn"), promptResult(99, "end_turn")]);
    sendInput(harness);
    await waitFor(() => ended(harness.events, "turn-1"));
    expect(eventTypes(harness.events).filter((type) => type === AgentRunEventType.TURN_STARTED)).toHaveLength(1);
    expect(harness.session.state).toBe("ready");
  });

  it("cancels a provider turn with session/cancel and reports it interrupted (AC-002, probe 2 B)", async () => {
    const harness = await start([...inputTurn(), queueEmpty(), running(WAKE, REMINDER), thought("running the job", WAKE),
      cancelRequest, turnCompleted(WAKE, "cancelled")]);
    sendInput(harness);
    await waitFor(() => harness.events.filter((event) => event.eventType === AgentRunEventType.TURN_STARTED).length === 2);
    const turnId = providerTurnId(harness);
    expect(await harness.session.cancel(turnId)).toBe(true);
    await waitFor(() => ended(harness.events, turnId));
    expect(ofTurn(harness.events, turnId).at(-1)).toMatchObject({ eventType: AgentRunEventType.TURN_INTERRUPTED, statusHint: "IDLE" });
    expect(harness.session.state).toBe("ready");
  });

  it("applies the idle timer to a provider turn", async () => {
    const harness = await start([...inputTurn(), running(WAKE, REMINDER)], { idleTimeoutMs: 150 });
    sendInput(harness);
    await waitFor(() => harness.failures.length > 0);
    expect(harness.failures[0]?.code).toBe("ACP_TURN_IDLE_TIMEOUT");
    const turnId = providerTurnId(harness);
    expect(eventTypes(harness.events).slice(-2)).toEqual([AgentRunEventType.TURN_INTERRUPTED, AgentRunEventType.ERROR]);
    expect(harness.events.at(-2)?.payload.turn_id).toBe(turnId);
  });

  it("reports an open provider turn interrupted on close", async () => {
    const harness = await start([...inputTurn(), running(WAKE, REMINDER), thought("still going", WAKE)]);
    sendInput(harness);
    await waitFor(() => harness.events.filter((event) => event.eventType === AgentRunEventType.TURN_STARTED).length === 2);
    const turnId = providerTurnId(harness);
    expect(harness.session.close().at(-1)).toMatchObject({ eventType: AgentRunEventType.TURN_INTERRUPTED, payload: { turn_id: turnId } });
    expect(harness.session.state).toBe("closed");
  });

  it("keeps client turns only for a profile without prompt signals (DeepSeek Harness, AC-004)", async () => {
    const harness = await start([...inputTurn(), ...providerTurn()], { profile: deepSeekHarnessSessionProfile });
    sendInput(harness);
    await waitFor(() => ended(harness.events, "turn-1"));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(eventTypes(harness.events).filter((type) => type === AgentRunEventType.TURN_STARTED)).toHaveLength(1);
    expect(eventTypes(harness.events)).not.toContain(AgentRunEventType.SYSTEM_TASK_NOTIFICATION);
    expect(harness.session.state).toBe("ready");
  });
});
