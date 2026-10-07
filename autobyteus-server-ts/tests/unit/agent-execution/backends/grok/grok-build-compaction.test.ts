import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { grokBuildSessionProfile } from "../../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import { buildGrokBuildCompactionStatusPayload } from "../../../../../src/agent-execution/backends/grok/grok-build-compaction-status-payload.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import { RuntimeMemoryEventAccumulator } from "../../../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../../../src/agent-memory/store/external-runtime-memory-writer.js";
import {
  createSessionHarness,
  fixturePath,
  fixtureSessionId,
  readFixture,
  waitFor,
  writeCustomFixture,
  type SessionHarness,
} from "../acp/acp-fake-agent-harness.js";

// Real Grok 1.0.46 traffic (tests/fixtures/grok-acp/compaction-*.jsonl; see the fixture README).
const context = { sessionId: "s-1", turnId: "t-1", callOrdinal: 1, model: "grok-4.7" };
const compactions = (events: AgentRunEvent[]) =>
  events.filter((event) => event.eventType === AgentRunEventType.COMPACTION_STATUS);
const summary = (events: AgentRunEvent[]) =>
  compactions(events).map((event) => `${String(event.payload.status)}:${String(event.payload.provider_event_id).split("-").at(-1)}`);

const harnesses: SessionHarness[] = [];
const tempDirs: string[] = [];
afterEach(async () => {
  for (const harness of harnesses.splice(0)) {
    harness.session.close();
    await harness.connection.close();
  }
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

/**
 * Replays a recorded Grok session through the real ACP connection and session: one canonical
 * turn per recorded prompt, cancelling the turn whose recording contains `session/cancel`.
 */
const replaySession = async (fixture: string) => {
  const rows = readFixture(fixture);
  const prompts = rows.flatMap((row, index) => row.dir === "out" && row.msg.method === "session/prompt" ? [index] : []);
  const harness = createSessionHarness({ fixture: fixturePath(fixture), autoExecuteTools: true });
  harnesses.push(harness);
  await harness.connection.initialize();
  await harness.session.openNew({ cwd: os.tmpdir(), mcpServers: [], _meta: { rules: "rules", yoloMode: true } });
  for (const [turn, start] of prompts.entries()) {
    const end = prompts[turn + 1] ?? rows.length;
    const turnId = `turn-${turn + 1}`;
    const ended = () => harness.events.some((event) => event.payload.turn_id === turnId && (
      event.eventType === AgentRunEventType.TURN_COMPLETED || event.eventType === AgentRunEventType.TURN_INTERRUPTED));
    harness.events.push(...harness.session.startTurn(turnId, [{ type: "text", text: "replay" }]));
    if (rows.slice(start, end).some((row) => row.dir === "out" && row.msg.method === "session/cancel")) {
      const cancelAfterStart = rows.slice(start, end).some((row) => row.dir === "in"
        && row.msg.params?.update?.sessionUpdate === "auto_compact_started");
      if (cancelAfterStart) await waitFor(() => compactions(harness.events).some((event) => event.payload.turn_id === turnId));
      expect(await harness.session.cancel(turnId)).toBe(true);
    }
    await waitFor(ended);
  }
  return harness.events;
};

/** Converter events → segment lifecycle (as the default pipeline) → runtime memory accumulator. */
const recordIntoMemory = async (events: AgentRunEvent[]) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "grok-compaction-memory-"));
  tempDirs.push(memoryDir);
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  writer.appendRawTrace({ traceType: "assistant", turnId: "earlier-turn", content: "earlier work", sourceEvent: "test" });
  const accumulator = new RuntimeMemoryEventAccumulator({ runId: "run-1", writer,
    toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
  const transformer = new AgentSegmentLifecycleEventTransformer();
  const segmentLifecycleState = new AgentSegmentLifecycleState();
  const lifecycleState = new AgentTurnLifecycleState();
  for (const event of events) {
    lifecycleState.observeEvent(event);
    for (const item of transformer.transform({ runContext: {} as never, events: [event], lifecycleState, segmentLifecycleState }))
      accumulator.recordRunEvent(item);
  }
  const store = new RunMemoryFileStore(memoryDir);
  const markers = [...store.listArchiveTurnRawTracesOrdered(), ...store.listTurnRawTracesOrdered()]
    .filter((trace) => trace.traceType === "provider_compaction_boundary")
    .map((trace) => trace.toolResult as Record<string, unknown>);
  return { segments: store.readRawTraceArchiveManifest().segments, markers };
};

describe("Grok Build compaction notifications", () => {
  it("maps the recorded auto_compact_* updates to compaction effects and keeps usage mapping", () => {
    const effects = readFixture("compaction-auto")
      .filter((row) => row.dir === "in" && row.msg.method === "_x.ai/session_notification")
      .flatMap((row) => grokBuildSessionProfile.interpretExtNotification(row.msg.method, row.msg.params, context));
    const compactionEffects = effects.filter((effect) => effect.kind === "compaction");
    expect(compactionEffects.map((effect) => effect.kind === "compaction" ? effect.phase : null))
      .toEqual(["started", "completed", "started", "completed", "started", "completed"]);
    expect(compactionEffects[1]).toEqual({ kind: "compaction", phase: "completed",
      eventId: "01a11508-e9a4-78d2-8b70-178bcc3f79ad-50",
      details: { sessionUpdate: "auto_compact_completed", tokens_before: 29164, tokens_after: 22243, elapsed_ms: 12406, summary_preview: null } });
    expect(effects.some((effect) => effect.kind === "usage")).toBe(true);
  });

  it.each([["auto_compact_failed", "failed"], ["auto_compact_cancelled", "cancelled"]])("maps %s to a %s effect", (update, phase) => {
    expect(grokBuildSessionProfile.interpretExtNotification("_x.ai/session_notification",
      { sessionId: "s-1", update: { sessionUpdate: update }, _meta: { eventId: "s-1-9" } }, context))
      .toEqual([{ kind: "compaction", phase, eventId: "s-1-9", details: { sessionUpdate: update } }]);
  });

  it("builds the Grok payloads: only the completion rotates, carrying tokens and duration", () => {
    const input = { sessionId: "s", turnId: "t", operationId: "s-47", details: {}, trigger: null, reason: null } as const;
    expect(buildGrokBuildCompactionStatusPayload({ ...input, phase: "started", eventId: "s-47", trigger: "auto",
      details: { tokens_used: 29164, context_window: 256000, percentage: 11, reason: "Context window 11% full" } })).toEqual({
      kind: "provider_compaction_boundary", runtime_kind: "GROK_BUILD", provider: "grok", source_surface: "grok.auto_compact_started",
      provider_session_id: "s", provider_event_id: "s-47", provider_timestamp: null, turn_id: "t", semantic_compaction: false,
      boundary_key: "grok:s:started:s-47", status: "compacting", rotation_eligible: false, trigger: "auto",
      tokens_used: 29164, context_window: 256000, percentage: 11,
    });
    expect(buildGrokBuildCompactionStatusPayload({ ...input, phase: "completed", eventId: "s-50", trigger: "auto",
      details: { tokens_before: 29164, tokens_after: 22243, elapsed_ms: 12406 } })).toMatchObject({
      source_surface: "grok.auto_compact_completed", provider_event_id: "s-47", boundary_key: "grok:s:completed:s-50",
      status: "compacted", rotation_eligible: true, trigger: "auto", pre_tokens: 29164, post_tokens: 22243, duration_ms: 12406,
    });
    expect(buildGrokBuildCompactionStatusPayload({ ...input, phase: "abandoned", eventId: null, trigger: "auto",
      reason: "Turn was interrupted before the compaction completed." })).toMatchObject({
      source_surface: "grok.compaction_abandoned", boundary_key: "grok:s:failed:s-47", status: "failed", rotation_eligible: false,
      error_message: "Turn was interrupted before the compaction completed.",
    });
    expect(buildGrokBuildCompactionStatusPayload({ ...input, phase: "failed", eventId: "s-49", details: { error: "limit" } }))
      .toMatchObject({ source_surface: "grok.auto_compact_failed", status: "failed", error_message: "limit" });
  });
});

describe("Grok Build compaction replayed through the ACP session into memory", () => {
  it("rotates once per automatic compaction, each started → completed pair sharing one id (REQ-G1, REQ-G2)", async () => {
    const events = await replaySession("compaction-auto");
    expect(summary(events)).toEqual(["compacting:47", "compacted:47", "compacting:99", "compacted:99", "compacting:153", "compacted:153"]);
    expect(compactions(events)[1]?.payload).toMatchObject({ pre_tokens: 29164, post_tokens: 22243, duration_ms: 12406,
      boundary_key: `grok:${fixtureSessionId("compaction-auto")}:completed:${fixtureSessionId("compaction-auto")}-50` });
    const memory = await recordIntoMemory(events);
    expect(memory.segments).toHaveLength(3);
    expect(memory.markers.filter((marker) => marker.rotation_eligible === true)).toHaveLength(3);
  });

  it("records a manual /compact as a single completed compaction and one archive (REQ-G2)", async () => {
    const events = await replaySession("compaction-manual");
    expect(summary(events)).toEqual(["compacted:84"]);
    expect(compactions(events)[0]?.payload).toMatchObject({ trigger: "manual", pre_tokens: 32537, post_tokens: 21637 });
    expect((await recordIntoMemory(events)).segments).toHaveLength(1);
  });

  it("closes an automatic compaction abandoned by a cancel as failed; the next pairs normally (REQ-G3)", async () => {
    const events = await replaySession("compaction-cancel-auto");
    expect(summary(events)).toEqual(["compacting:50", "failed:50", "compacting:54", "compacted:54"]);
    const failed = compactions(events)[1]!;
    expect(failed.payload).toMatchObject({ source_surface: "grok.compaction_abandoned", turn_id: "turn-2", rotation_eligible: false,
      error_message: "Turn was interrupted before the compaction completed." });
    const interrupted = events.find((event) => event.eventType === AgentRunEventType.TURN_INTERRUPTED)!;
    expect(events.indexOf(failed)).toBe(events.indexOf(interrupted) - 1);
    const memory = await recordIntoMemory(events);
    expect(memory.segments).toHaveLength(1);
    expect(memory.markers.map((marker) => marker.status)).toEqual(["compacting", "failed", "compacting", "compacted"]);
  });

  it("records nothing for a cancelled manual /compact, which Grok reports no compaction for (G11)", async () => {
    const events = await replaySession("compaction-cancel-manual");
    expect(compactions(events)).toEqual([]);
    expect((await recordIntoMemory(events)).segments).toHaveLength(0);
  });

  it("records Grok's own completed report for a no-op /compact as one boundary (G09)", async () => {
    const events = await replaySession("compaction-noop");
    expect(summary(events)).toEqual(["compacted:42"]);
    expect(compactions(events)[0]?.payload).toMatchObject({ pre_tokens: 16542, post_tokens: 16542, trigger: "manual" });
    expect((await recordIntoMemory(events)).segments).toHaveLength(1);
  });

  it("does not re-record compactions that session/load replays on restore (REQ-G4)", async () => {
    const rows = readFixture("load");
    const sessionId = fixtureSessionId("load");
    const loadResult = rows.findIndex((row) => row.dir === "in" && row.msg.id === 2 && "result" in row.msg);
    const replayed = (sessionUpdate: string, extra: Record<string, unknown>, eventId: string) => ({ dir: "in" as const, msg: {
      jsonrpc: "2.0", method: "_x.ai/session_notification",
      params: { sessionId, update: { sessionUpdate, ...extra }, _meta: { eventId } } } });
    const harness = createSessionHarness({ fixture: writeCustomFixture([
      ...rows.slice(0, loadResult),
      replayed("auto_compact_started", { tokens_used: 29164 }, `${sessionId}-47`),
      replayed("auto_compact_completed", { tokens_before: 29164, tokens_after: 22243, elapsed_ms: 12406 }, `${sessionId}-50`),
      ...rows.slice(loadResult),
    ]) });
    harnesses.push(harness);
    await harness.connection.initialize();
    await harness.session.openLoad({ sessionId, cwd: os.tmpdir(), mcpServers: [] });
    // Production restore awaits MCP readiness and run publication before any input; the SDK
    // dispatches extension notifications a few hops after the load response, so yield once.
    await new Promise((resolve) => setImmediate(resolve));
    harness.events.push(...harness.session.startTurn("turn-1", [{ type: "text", text: "continue" }]));
    await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(compactions(harness.events)).toEqual([]);
  });

  it("never rotates twice for the same Grok completion, even if a replay were recorded again (REQ-G1, REQ-G4)", async () => {
    const events = await replaySession("compaction-manual");
    const completion = compactions(events)[0]!;
    const replayedInLaterTurn = { ...completion, payload: { ...completion.payload, turn_id: "turn-restored" } };
    const memory = await recordIntoMemory([...events, replayedInLaterTurn]);
    expect(memory.segments).toHaveLength(1);
    expect(memory.markers.filter((marker) => marker.rotation_eligible === true)).toHaveLength(1);
  });
});
