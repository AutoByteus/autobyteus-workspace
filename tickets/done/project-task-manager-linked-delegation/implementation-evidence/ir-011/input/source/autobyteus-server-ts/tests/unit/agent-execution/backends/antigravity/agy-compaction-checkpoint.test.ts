import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgyStreamEventConverter } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { parseAgyStreamMessage, type AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import { RuntimeMemoryEventAccumulator } from "../../../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../../../src/agent-memory/store/external-runtime-memory-writer.js";

// Real AGY 1.2.16 stream-json stdout (tests/fixtures/agy-compaction/README.md).
const fixture = (name: string): AgyStreamMessage[] =>
  fs.readFileSync(path.resolve(__dirname, `../../../../fixtures/agy-compaction/${name}.stdout.jsonl`), "utf8")
    .split("\n").filter(Boolean).map((line) => parseAgyStreamMessage(line)).filter((message) => message !== null);

const TWICE = fixture("agy-stream-auto-compaction-twice");
const ONCE = fixture("agy-stream-auto-compaction");
const conversationOf = (messages: AgyStreamMessage[]): string => {
  const init = messages.find((message) => message.event === "init");
  if (!init || init.event !== "init") throw new Error("fixture lacks init");
  return init.conversation_id;
};

/** Replays the recorded stream as the backend does: one canonical turn per `result`. */
const replay = (messages: AgyStreamMessage[], compactionDetection: boolean, extra: AgyStreamMessage[] = []) => {
  const converter = new AgyStreamEventConverter("run-agy", conversationOf(messages), "gemini-3.8-flash-low",
    undefined, undefined, undefined, { compactionDetection });
  const events: AgentRunEvent[] = [];
  let turn = 0;
  let turnOpen = false;
  for (const message of [...messages, ...extra]) {
    if (message.event === "init") continue;
    if (!turnOpen) { turn += 1; events.push(...converter.startTurn(`turn-${turn}`)); turnOpen = true; }
    events.push(...converter.convert(message));
    if (message.event === "result") turnOpen = false;
  }
  return events;
};

const compactions = (events: AgentRunEvent[]) =>
  events.filter((event) => event.eventType === AgentRunEventType.COMPACTION_STATUS);

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true })));
});

/** Converter events → segment lifecycle (as the default pipeline) → runtime memory accumulator. */
const recordIntoMemory = async (events: AgentRunEvent[]) => {
  const memoryDir = await fsp.mkdtemp(path.join(os.tmpdir(), "agy-compaction-memory-"));
  tempDirs.push(memoryDir);
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  const accumulator = new RuntimeMemoryEventAccumulator({ runId: "run-agy", writer,
    toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
  const transformer = new AgentSegmentLifecycleEventTransformer();
  const segmentLifecycleState = new AgentSegmentLifecycleState();
  const lifecycleState = new AgentTurnLifecycleState();
  for (const event of events) {
    lifecycleState.observeEvent(event);
    const canonical = transformer.transform({ runContext: {} as never, events: [event], lifecycleState, segmentLifecycleState });
    for (const item of canonical) accumulator.recordRunEvent(item);
  }
  const store = new RunMemoryFileStore(memoryDir);
  return {
    manifest: store.readRawTraceArchiveManifest(),
    active: store.listTurnRawTracesOrdered(),
    archived: store.listArchiveTurnRawTracesOrdered(),
  };
};

describe("AGY checkpoint steps as provider compaction boundaries", () => {
  it("maps each real checkpoint DONE step to one completed, rotation-eligible COMPACTION_STATUS (AC-A02)", () => {
    const events = replay(TWICE, true);
    const found = compactions(events);
    expect(found).toHaveLength(2);
    expect(found[0]).toEqual({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      runId: "run-agy",
      statusHint: null,
      payload: {
        kind: "provider_compaction_boundary",
        runtime_kind: "ANTIGRAVITY",
        provider: "antigravity",
        source_surface: "antigravity.checkpoint",
        boundary_key: "agy:5bd8c148-aa5c-4f18-a0e8-1c2f52782771:checkpoint:9",
        provider_session_id: "5bd8c148-aa5c-4f18-a0e8-1c2f52782771",
        provider_event_id: "checkpoint:9",
        provider_timestamp: null,
        turn_id: "turn-5",
        status: "compacted",
        trigger: "auto",
        rotation_eligible: true,
        semantic_compaction: false,
        duration_ms: 7293,
      },
    });
    expect(found[1]!.payload).toMatchObject({
      boundary_key: "agy:5bd8c148-aa5c-4f18-a0e8-1c2f52782771:checkpoint:18",
      provider_event_id: "checkpoint:18",
      turn_id: "turn-9",
      duration_ms: 6731,
    });
  });

  it("emits the compaction inside its turn, after the turn start and before the assistant reply", () => {
    const events = replay(ONCE, true);
    const index = events.findIndex((event) => event.eventType === AgentRunEventType.COMPACTION_STATUS);
    const turnStart = events.findIndex((event) => event.eventType === AgentRunEventType.TURN_STARTED &&
      event.payload.turn_id === "turn-5");
    const reply = events.findIndex((event, position) => position > turnStart &&
      event.eventType === AgentRunEventType.SEGMENT_START);
    expect(compactions(events)).toHaveLength(1);
    expect(turnStart).toBeLessThan(index);
    expect(index).toBeLessThan(reply);
  });

  it("rotates once per checkpoint when the real stream is recorded into memory (AC-A01a)", async () => {
    const memory = await recordIntoMemory(replay(TWICE, true));
    expect(memory.manifest.segments).toHaveLength(2);
    expect(memory.manifest.segments.map((segment) => segment.boundary_key)).toEqual([
      "agy:5bd8c148-aa5c-4f18-a0e8-1c2f52782771:checkpoint:9",
      "agy:5bd8c148-aa5c-4f18-a0e8-1c2f52782771:checkpoint:18",
    ]);
    const markers = [...memory.archived, ...memory.active].filter((trace) => trace.traceType === "provider_compaction_boundary");
    expect(markers).toHaveLength(2);
    expect(memory.active[0]).toMatchObject({ traceType: "provider_compaction_boundary",
      toolResult: expect.objectContaining({ provider: "antigravity", duration_ms: 6731, rotation_eligible: true }) });
    expect(memory.active.filter((trace) => trace.traceType === "assistant")).toHaveLength(3);
    expect(memory.archived.filter((trace) => trace.traceType === "assistant")).toHaveLength(8);
  });

  it("ignores checkpoint steps when detection is off (AGY < 1.2.16 or unreadable version, AC-A04)", async () => {
    const events = replay(TWICE, false);
    expect(compactions(events)).toEqual([]);
    const memory = await recordIntoMemory(events);
    expect(memory.manifest.segments).toEqual([]);
    expect(memory.active.some((trace) => trace.traceType === "provider_compaction_boundary")).toBe(false);
  });

  it("reports a repeated checkpoint step once, even in a later turn (AC-A05)", async () => {
    const conversation = conversationOf(ONCE);
    const repeated: AgyStreamMessage = { event: "step_update", step_update: { conversation_id: conversation,
      step_index: 9, state: "DONE", step_type: "checkpoint", duration_seconds: 7.719925 } };
    const result: AgyStreamMessage = { event: "result", result: { conversation_id: conversation, status: "SUCCESS", response: "OK" } };
    const events = replay(ONCE, true, [repeated, result]);
    expect(compactions(events)).toHaveLength(1);
    expect((await recordIntoMemory(events)).manifest.segments).toHaveLength(1);
  });

  it.each(["ACTIVE", "ERROR", "PENDING"])("does not report a checkpoint step in state %s", (state) => {
    const converter = new AgyStreamEventConverter("run-agy", "conversation", "gemini-3.8-flash-low",
      undefined, undefined, undefined, { compactionDetection: true });
    converter.startTurn("turn-1");
    expect(converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
      step_index: 9, state, step_type: "checkpoint", duration_seconds: 1 } })).toEqual([]);
  });

  it("keeps duration_ms null when the checkpoint step has no duration", () => {
    const converter = new AgyStreamEventConverter("run-agy", "conversation", "gemini-3.8-flash-low",
      undefined, undefined, undefined, { compactionDetection: true });
    converter.startTurn("turn-1");
    const [event] = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
      step_index: 4, state: "DONE", step_type: "checkpoint" } });
    expect(event?.payload).toMatchObject({ boundary_key: "agy:conversation:checkpoint:4", duration_ms: null });
  });
});
