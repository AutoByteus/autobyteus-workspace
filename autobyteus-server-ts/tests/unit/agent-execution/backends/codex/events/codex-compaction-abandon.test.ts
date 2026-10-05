import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import type { JsonObject } from "../../../../../../src/agent-execution/backends/codex/codex-app-server-json.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import { RuntimeMemoryEventAccumulator } from "../../../../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { createCodexThreadEventHarness } from "../../../../../fixtures/codex-thread-event-harness.js";

type Notification = Readonly<{ method: string; params: JsonObject }>;

// Real Codex app-server notifications (tests/fixtures/codex-compaction/README.md).
const fixture = (name: string): Notification[] =>
  fs.readFileSync(path.resolve(__dirname, `../../../../../fixtures/codex-compaction/${name}.notifications.jsonl`), "utf8")
    .split("\n").filter(Boolean).map((line) => JSON.parse(line) as Notification);

const replay = (notifications: Notification[]) => {
  const harness = createCodexThreadEventHarness("run-codex");
  return notifications.flatMap((notification) => harness.emitThroughThread(notification));
};

const compactions = (events: AgentRunEvent[]) =>
  events.filter((event) => event.eventType === AgentRunEventType.COMPACTION_STATUS);
const summary = (events: AgentRunEvent[]) =>
  compactions(events).map((event) => `${String(event.payload.status)}:${String(event.payload.provider_event_id)}`);

const INTERRUPTED = "01a10877-2924-7da3-ac64-c5b641eeb9d5";
const LATER = "01a10877-3c7d-71b2-8627-67ed1789d9f2";
const THREAD = "01a10877-1af2-7c52-9258-b92b78d14fe8";
const INTERRUPTED_TURN = "01a10877-2907-7e92-b7ed-e08e409b9c55";

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true })));
});

/** Converter events → segment lifecycle (as the default pipeline) → runtime memory accumulator. */
const recordIntoMemory = async (events: AgentRunEvent[]) => {
  const memoryDir = await fsp.mkdtemp(path.join(os.tmpdir(), "codex-compaction-memory-"));
  tempDirs.push(memoryDir);
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  writer.appendRawTrace({ traceType: "assistant", turnId: "earlier-turn", content: "earlier work", sourceEvent: "test" });
  const accumulator = new RuntimeMemoryEventAccumulator({ runId: "run-codex", writer,
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
  return { manifest: store.readRawTraceArchiveManifest(), markers };
};

describe("Codex abandoned compaction close (real app-server notifications)", () => {
  it("closes the interrupted automatic compaction as failed before its turn ends; the next one pairs normally (AC-C01a)", () => {
    const events = replay(fixture("codex-interrupt-auto"));
    expect(summary(events)).toEqual([
      `compacting:${INTERRUPTED}`, `failed:${INTERRUPTED}`, `compacting:${LATER}`, `compacted:${LATER}`,
    ]);
    const failed = compactions(events)[1]!;
    expect(failed).toEqual({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      runId: "run-codex",
      statusHint: null,
      payload: {
        kind: "provider_compaction_boundary",
        runtime_kind: "CODEX",
        provider: "codex",
        source_surface: "codex.context_compaction_abandoned",
        boundary_key: `codex:${THREAD}:${INTERRUPTED}:failed`,
        provider_thread_id: THREAD,
        provider_event_id: INTERRUPTED,
        provider_timestamp: null,
        turn_id: INTERRUPTED_TURN,
        status: "failed",
        rotation_eligible: false,
        semantic_compaction: false,
        error_message: "Compaction interrupted before it completed (turn interrupted).",
      },
    });
    const started = compactions(events)[0]!;
    expect(started.payload).toMatchObject({ provider_thread_id: THREAD, turn_id: INTERRUPTED_TURN });
    const interrupted = events.find(event => event.eventType === AgentRunEventType.TURN_INTERRUPTED
      && event.payload.turnId === INTERRUPTED_TURN)!;
    expect(interrupted).toBeDefined();
    expect(events.indexOf(failed)).toBe(events.indexOf(interrupted) - 1);
  });

  it("records the abandoned compaction as a non-rotating failed marker and rotates only the completed one", async () => {
    const memory = await recordIntoMemory(replay(fixture("codex-interrupt-auto")));
    expect(memory.markers.map((marker) => `${String(marker.status)}:${String(marker.provider_event_id)}`)).toEqual([
      `compacting:${INTERRUPTED}`, `failed:${INTERRUPTED}`, `compacting:${LATER}`, `compacted:${LATER}`,
    ]);
    expect(memory.markers[1]).toMatchObject({ rotation_eligible: false,
      error_message: "Compaction interrupted before it completed (turn interrupted)." });
    expect(memory.manifest.segments.map((segment) => segment.boundary_key)).toEqual([`codex:${THREAD}:${LATER}`]);
  });

  it("closes an interrupted manual compaction the same way, without archiving (SCN-C2)", async () => {
    const events = replay(fixture("codex-interrupt-manual"));
    expect(summary(events)).toEqual([
      "compacting:01a10877-d5ac-7080-8e4d-1556635f5c98", "failed:01a10877-d5ac-7080-8e4d-1556635f5c98",
    ]);
    expect((await recordIntoMemory(events)).manifest.segments).toEqual([]);
  });

  it("leaves completed automatic compactions unchanged: six pairs, six archives, no failed close (SCN-C6)", async () => {
    const events = replay(fixture("codex-auto"));
    const statuses = compactions(events).map((event) => event.payload.status);
    expect(statuses).toEqual(Array.from({ length: 6 }, () => ["compacting", "compacted"]).flat());
    expect((await recordIntoMemory(events)).manifest.segments).toHaveLength(6);
  });
});

describe("Codex abandoned compaction close (turn and run endings)", () => {
  const start = (harness: ReturnType<typeof createCodexThreadEventHarness>, turnId: string, itemId: string) => {
    harness.emitThroughThread({ method: CodexThreadEventName.TURN_STARTED,
      params: { threadId: "thread-1", turn: { id: turnId, status: "inProgress" } } });
    return harness.emitThroughThread({ method: CodexThreadEventName.ITEM_STARTED,
      params: { threadId: "thread-1", turnId, item: { type: "contextCompaction", id: itemId } } });
  };
  const turnCompleted = (status: string, turnId = "turn-1"): Notification => ({ method: CodexThreadEventName.TURN_COMPLETED,
    params: { threadId: "thread-1", turn: { id: turnId, status, error: null } } });

  it.each([
    ["completed", "Compaction did not complete before its turn ended."],
    ["failed", "Compaction did not complete (turn failed)."],
    ["interrupted", "Compaction interrupted before it completed (turn interrupted)."],
  ])("closes an open compaction when its turn completes with status %s (SCN-C3)", (status, message) => {
    const harness = createCodexThreadEventHarness("run-codex");
    expect(summary(start(harness, "turn-1", "item-1"))).toEqual(["compacting:item-1"]);
    const ending = harness.emitThroughThread(turnCompleted(status));
    expect(ending.map((event) => event.eventType)).toEqual([
      AgentRunEventType.COMPACTION_STATUS, status === "failed" ? AgentRunEventType.ERROR
        : status === "interrupted" ? AgentRunEventType.TURN_INTERRUPTED : AgentRunEventType.TURN_COMPLETED]);
    expect(ending[0]!.payload).toMatchObject({ status: "failed", provider_event_id: "item-1", turn_id: "turn-1",
      boundary_key: "codex:thread-1:item-1:failed", error_message: message, rotation_eligible: false });
  });

  it("closes nothing at turn end once the compaction completed", () => {
    const harness = createCodexThreadEventHarness("run-codex");
    start(harness, "turn-1", "item-1");
    harness.emitThroughThread({ method: CodexThreadEventName.ITEM_COMPLETED,
      params: { threadId: "thread-1", turnId: "turn-1", item: { type: "contextCompaction", id: "item-1" } } });
    expect(compactions(harness.emitThroughThread(turnCompleted("completed")))).toEqual([]);
  });

  it("closes the compaction of a turn ended by a terminal turn error, before the error (SCN-C4)", () => {
    const harness = createCodexThreadEventHarness("run-codex");
    start(harness, "turn-1", "item-1");
    const ending = harness.emitThroughThread({ method: CodexThreadEventName.ERROR,
      params: { threadId: "thread-1", turnId: "turn-1", error: { message: "model stream failed" } } });
    expect(ending.map((event) => event.eventType)).toEqual([AgentRunEventType.COMPACTION_STATUS, AgentRunEventType.ERROR]);
    expect(ending[0]!.payload).toMatchObject({ status: "failed", provider_event_id: "item-1",
      error_message: "Compaction did not complete (turn failed)." });
    expect(ending[0]!.statusHint).toBeNull();
  });

  it("keeps the compaction open on a retrying (diagnostic) error", () => {
    const harness = createCodexThreadEventHarness("run-codex");
    start(harness, "turn-1", "item-1");
    expect(compactions(harness.emitThroughThread({ method: CodexThreadEventName.ERROR,
      params: { threadId: "thread-1", turnId: "turn-1", willRetry: true, error: { message: "retrying" } } }))).toEqual([]);
    expect(summary(harness.emitThroughThread(turnCompleted("interrupted")))).toEqual(["failed:item-1"]);
  });

  it.each([
    ["CODEX_APP_SERVER_CLOSED", "Compaction did not complete (Codex app server closed)."],
    ["CODEX_RUNTIME_FAILED", "Compaction did not complete (Codex runtime error)."],
  ])("closes every open compaction on a terminal runtime error %s (SCN-C4)", (code, message) => {
    const harness = createCodexThreadEventHarness("run-codex");
    start(harness, "turn-1", "item-1");
    const ending = harness.emitRuntimeError(code, "runtime ended");
    expect(ending.map((event) => event.eventType)).toEqual([AgentRunEventType.COMPACTION_STATUS, AgentRunEventType.ERROR]);
    expect(ending[0]!.payload).toMatchObject({ status: "failed", provider_event_id: "item-1", error_message: message });
  });
});
