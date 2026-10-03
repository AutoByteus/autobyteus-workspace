import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgyStreamEventConverter } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { readAgyNativeToolArguments } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-arguments-reader.js";
import { RuntimeToolTraceSequencer } from "../../../../../src/agent-memory/services/runtime-tool-trace-sequencer.js";
import { ExternalRuntimeMemoryWriter } from "../../../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { normalizeRawTraceRecords } from "../../../../../src/agent-memory/services/raw-trace-record-normalizer.js";
import { buildHistoricalReplayEvents } from "../../../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { buildRunProjectionActivities } from "../../../../../src/run-history/projection/transformers/historical-replay-events-to-activities.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const conversationId = "d35a5f83-31c3-4594-9480-52ab2dbba2bd";

describe("native first-input snapshot through the existing saved-history boundary (local integration)", () => {
  it.each([false, true])("persists full STARTED immediately, reopens without native evidence, and leaves old traces intact (resumed=%s)", async (resumed) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "agy-input-persistence-")); roots.push(root);
    const brainRoot = path.join(root, "brain"); const memoryDir = path.join(root, "memory");
    const file = path.join(brainRoot, conversationId, ".system_generated/logs/transcript_full.jsonl");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const args = { TargetFile: "/owned/same.txt", CodeContent: "newly recorded\n🙂\n", Overwrite: false, EmptyFile: false,
      count: 0, empty: "", typed: [null, true, { value: "exact" }] };
    const summary = { TargetFile: args.TargetFile };
    if (resumed) {
      const oldWriter = new ExternalRuntimeMemoryWriter({ memoryDir });
      oldWriter.appendRawTrace({ turnId: "old-turn", traceType: "tool_call", sourceEvent: "TOOL_EXECUTION_STARTED",
        toolCallId: "agy-tool-old-turn-2", toolName: "write_to_file", toolArgs: summary });
      oldWriter.appendRawTrace({ turnId: "old-turn", traceType: "tool_result", sourceEvent: "TOOL_EXECUTION_SUCCEEDED",
        toolCallId: "agy-tool-old-turn-2", toolName: "write_to_file", toolResult: { provider_state: "DONE", output: null }, toolError: null });
    }
    const memoryFile = path.join(memoryDir, "raw_traces_active.jsonl");
    const oldBytes = resumed ? fs.readFileSync(memoryFile, "utf8") : "";
    fs.writeFileSync(file, [
      { step_index: 0, source: "USER_EXPLICIT", type: "USER_INPUT", status: "DONE" },
      { step_index: 1, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE", tool_calls: [{ name: "write_to_file", args }] },
      { step_index: 2, source: "MODEL", type: "GENERIC", status: "DONE" },
    ].map((row) => JSON.stringify(row)).join("\n") + "\n");
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const sequencer = new RuntimeToolTraceSequencer({ writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
      flushReasoningBoundary: () => undefined });
    const converter = new AgyStreamEventConverter("run", conversationId, "model"); converter.startTurn("new-turn");
    const message = { event: "step_update" as const, step_update: { conversation_id: conversationId,
      step_index: 2, step_type: "tool", state: "ACTIVE", tool_name: "write_to_file", tool_info: { parameters: summary } } };
    const lookup = converter.getPendingNativeToolArgumentLookup(message); expect(lookup).not.toBeNull();
    const resolved = await readAgyNativeToolArguments(conversationId, lookup!, { brainRoot }); expect(resolved).toEqual(args);
    const started = converter.convert(message, resolved)[0]!;
    sequencer.recordCallObservation(started, "new-turn");
    const firstSaved = new RunMemoryFileStore(memoryDir).listRawTraceDicts().at(-1);
    expect(firstSaved).toMatchObject({ trace_type: "tool_call", source_event: "TOOL_EXECUTION_STARTED",
      tool_call_id: "agy-tool-new-turn-2", tool_args: args });
    fs.rmSync(brainRoot, { recursive: true }); // reopen must rely only on the canonical capture
    expect(converter.getPendingNativeToolArgumentLookup(message)).toBeNull();
    const terminal = converter.convert({ ...message, step_update: { ...message.step_update, state: "DONE",
      tool_info: { parameters: summary, output: "unchanged result" } } })[0]!;
    expect(terminal.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
    expect(terminal.payload.arguments).toEqual(started.payload.arguments);
    sequencer.recordTerminal(terminal, "new-turn");
    const diskBytes = fs.readFileSync(memoryFile, "utf8"); expect(diskBytes.startsWith(oldBytes)).toBe(true);
    const rawRecords = diskBytes.trim().split("\n").map((line) => JSON.parse(line));
    const activities = buildRunProjectionActivities(buildHistoricalReplayEvents(normalizeRawTraceRecords(rawRecords, null)));
    const saved = activities.find((activity) => activity.kind === "tool" && activity.invocationId === "agy-tool-new-turn-2");
    expect(saved).toMatchObject({ toolName: "write_to_file", arguments: args, status: "success",
      result: { provider_state: "DONE", output: "unchanged result" } });
    if (resumed) expect(activities.find((activity) => activity.kind === "tool" && activity.invocationId === "agy-tool-old-turn-2"))
      .toMatchObject({ arguments: summary, status: "success" });
  });
});
