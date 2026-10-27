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
import {
  CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID,
  SKILL_UPDATE_NOTICE_SENDER_ID,
} from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { buildSkillUpdateNoticeMessage } from "../../../src/skill-update-notices/services/skill-update-notice-builder.js";
import type { AgentRunUserMessageForwardedPayload } from "../../../src/agent-execution/domain/agent-run-command-observer.js";

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
      includeRawTraces: true, includeArchive: false, 
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

  it("does not record notices from other producers (history behavior unchanged)", async () => {
    const { accumulator, readTraces } = await setup();
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, {
      sender_id: "system.other_producer",
      content: "Another producer finished its work for this run.",
    }));

    expect(readTraces()).toEqual([]);
  });

  it("records a skill update notice combined into an input as one system notice beside the unchanged user message", async () => {
    const { accumulator, readTraces } = await setup();
    const notice = "[Platform notice — skill updated]\n\nYour skill package `code-review` has been updated (/s/code-review).\n\nChanged files:\n- SKILL.md (changed)";
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-3" }));
    // The observer reports the input as admitted (the combined provider message is never recorded).
    accumulator.recordForwardedUserMessage(forwarded(new AgentInputUserMessage("Please review PR 12."), "turn-3"));
    accumulator.recordRunEvent(event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, {
      sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, content: notice, turn_id: "turn-3",
    }));

    const traces = readTraces();
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.turnId])).toEqual([
      ["user", "Please review PR 12.", "turn-3"],
      ["system_task_notification", notice, "turn-3"],
    ]);
    expect(buildRunProjectionBundleFromEvents("run-1", buildHistoricalReplayEvents(traces)).conversation
      .map((entry) => [entry.kind, entry.content])).toEqual([
      ["message", "Please review PR 12."],
      ["system_task_notification", notice],
    ]);
  });

  it("records a notice-only skill update message once, as a system notice and never as a user message", async () => {
    const { accumulator, readTraces } = await setup();
    const notice = "[Platform notice — skill updated]\n\nYour skill package `deep-research` is no longer available.\n\nDo not rely on a skill that is no longer available.";
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-4" }));
    accumulator.recordForwardedUserMessage(forwarded(buildSkillUpdateNoticeMessage(notice), "turn-4"));
    accumulator.recordRunEvent(event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, {
      sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, content: notice, turn_id: "turn-4",
    }));

    expect(readTraces().map((trace) => [trace.traceType, trace.senderId])).toEqual([
      ["system_task_notification", SKILL_UPDATE_NOTICE_SENDER_ID],
    ]);
  });
});

const forwarded = (message: AgentInputUserMessage, turnId: string): AgentRunUserMessageForwardedPayload => ({
  runId: "run-1",
  runtimeKind: "codex_app_server" as never,
  config: {} as never,
  platformAgentRunId: null,
  message,
  result: { accepted: true, turnId },
  forwardedAt: new Date(),
});
