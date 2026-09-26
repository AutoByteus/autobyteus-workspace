import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { buildHistoricalReplayEvents } from "../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { buildRunProjectionBundleFromEvents } from "../../../src/run-history/projection/run-projection-utils.js";
import { CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";

const tempDirs = new Set<string>();
afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({
  eventType, runId: "run-1", payload, statusHint: null,
});

const setup = async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-memory-notice-"));
  tempDirs.add(memoryDir);
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  const accumulator = new RuntimeMemoryEventAccumulator({
    runId: "run-1", writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
  });
  const readTraces = () => new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
    .getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true, includeArchive: false, includeEpisodic: false, includeSemantic: false,
    }).rawTraces ?? [];
  return { accumulator, readTraces };
};

describe("system task notification memory trace (REQ-003, ARCH-F-004)", () => {
  it("records a Claude background-task notice for its turn and replays it into the conversation", async () => {
    const { accumulator, readTraces } = await setup();
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-2" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, {
      sender_id: CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID,
      content: "Background task completed: Build app (completed)",
      turn_id: "turn-2",
    }));

    const traces = readTraces();
    expect(traces).toEqual([expect.objectContaining({
      traceType: "system_task_notification",
      turnId: "turn-2",
      content: "Background task completed: Build app (completed)",
      senderId: CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID,
    })]);
    const replay = buildHistoricalReplayEvents(traces);
    expect(replay).toEqual([expect.objectContaining({
      kind: "system_task_notification",
      senderId: CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID,
      content: "Background task completed: Build app (completed)",
    })]);
    expect(buildRunProjectionBundleFromEvents("run-1", replay).conversation).toEqual([expect.objectContaining({
      kind: "system_task_notification",
      role: null,
      senderId: CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID,
      content: "Background task completed: Build app (completed)",
    })]);
  });

  it("does not record notices from other producers, such as skill improvement (history behavior unchanged)", async () => {
    const { accumulator, readTraces } = await setup();
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, {
      sender_id: "system.skill_improvement",
      content: "Improve skills finished for this run.",
    }));

    expect(readTraces()).toEqual([]);
  });
});
