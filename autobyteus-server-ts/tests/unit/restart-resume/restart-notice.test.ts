import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
/**
 * autobyteus-448 DEC-003 (restart reminder text per cause) and autobyteus-285 D4 (REQ-004, SR-005): the reminder is a
 * SYSTEM input from `system.restart_resume`; every place shows it as the run's own system notice, and the run's memory
 * records it once as a system notice, never as user input.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { shouldSuppressSystemTaskNotification } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { buildRestartNotice, buildRestartNoticeText, restartNoticeLifecycleObserver, type RestartReminderFacts } from "../../../src/restart-resume/restart-notice.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";

const facts = (overrides: Partial<RestartReminderFacts> = {}): RestartReminderFacts =>
  ({ cause: "update", version: "1.5.14", restartedAt: "2026-11-17T22:20:05.000Z", interruptedTurn: true, ...overrides });
const BACKGROUND_LINE = "If you started any background tasks, the restart stopped them. Check what you still need: restart it, or continue your work.";
const UNEXPECTED_STOP_LINE = "If you started any background tasks, some may still be running: the application stopped unexpectedly and could not stop them, "
  + "and any that are still running are no longer tracked, so you will not be told when they finish. Check them (for example with `ps` and "
  + "the pids you were given); stop any you still need and start them again so they are tracked, or continue your work.";

describe("buildRestartNoticeText (DEC-003)", () => {
  it("update, mid-turn: the cause with the version, the interrupted turn and the background-task reminder", () => {
    expect(buildRestartNoticeText({ ...facts(), resumedDelegated: [] })).toBe([
      "[Platform notice — application restarted]",
      "",
      "The application restarted at 2026-11-17 22:20 UTC (reason: an update to v1.5.14).",
      "Your previous turn was interrupted; check the results of any tool calls that were running before you repeat them.",
      BACKGROUND_LINE,
    ].join("\n"));
  });

  it("names a restart and an unexpected stop; DEC-008: after an unexpected stop the tasks may still be running and untracked; an idle run gets no interrupted-turn line", () => {
    expect(buildRestartNoticeText({ ...facts({ cause: "restart", interruptedTurn: false }), resumedDelegated: [] }).split("\n").slice(2)).toEqual([
      "The application restarted at 2026-11-17 22:20 UTC (reason: a restart).", BACKGROUND_LINE]);
    expect(buildRestartNoticeText({ ...facts({ cause: "unexpected_stop", interruptedTurn: false }), resumedDelegated: [] }).split("\n").slice(2)).toEqual([
      "The application restarted at 2026-11-17 22:20 UTC (reason: an unexpected stop (a crash, a forced quit or a power loss)).", UNEXPECTED_STOP_LINE]);
    expect(buildRestartNoticeText({ ...facts({ version: "v2.0.0" }), resumedDelegated: [] })).toContain("an update to v2.0.0)");
  });

  it("DEC-008: a mid-turn run after an unexpected stop gets the interrupted line and the still-running line, never the stopped line", () => {
    const text = buildRestartNoticeText({ ...facts({ cause: "unexpected_stop", interruptedTurn: true }), resumedDelegated: [] });
    expect(text).toContain("Your previous turn was interrupted;");
    expect(text.endsWith(UNEXPECTED_STOP_LINE)).toBe(true);
    expect(text).not.toContain(BACKGROUND_LINE);
    expect(buildRestartNoticeText({ ...facts({ cause: "restart" }), resumedDelegated: [] })).not.toContain(UNEXPECTED_STOP_LINE);
  });

  it("lists the accepted runs it delegated to (DS-9, the wake only)", () => {
    const names = ["Researcher (child-1)", "child-2"];
    expect(buildRestartNoticeText({ ...facts(), resumedDelegated: names }))
      .toContain("These runs you delegated were resumed too and are working: Researcher (child-1), child-2.");
    expect(buildRestartNoticeText({ ...facts(), resumedDelegated: [] })).not.toContain("delegated were resumed");
  });
});

describe("buildRestartNotice (the wake)", () => {
  it("is a notice-only SYSTEM input with the named message and dedupe keys", () => {
    const message = buildRestartNotice({ agentRunId: "worker-1", facts: facts(), resumedDelegated: [] });
    expect(message.senderType).toBe(SenderType.SYSTEM);
    expect(message.metadata).toMatchObject({
      sender_id: RESTART_RESUME_NOTICE_SENDER_ID,
      message_id: "restart-resume:2026-11-17T22:20:05.000Z:worker-1",
      dedupe_key: "agent_run_input:worker-1:restart-resume:2026-11-17T22:20:05.000Z:worker-1",
    });
    expect(shouldSuppressSystemTaskNotification(message.metadata)).toBe(true);
    // autobyteus-526: the wake's message id is its notice id too.
    expect(readPlatformInputPreface(message.metadata)).toEqual({ content: message.content, senderId: RESTART_RESUME_NOTICE_SENDER_ID, originalContent: null,
      noticeId: "restart-resume:2026-11-17T22:20:05.000Z:worker-1" });
  });
});

describe("restartNoticeLifecycleObserver (SR-005: one display for every place)", () => {
  it("publishes the run's own system notice once the input is forwarded, with its turn", async () => {
    const publishEvent = vi.fn(async () => undefined);
    // autobyteus-526: the notice published for the wake carries the message's one notice id.
    const message = { content: "notice text", metadata: platformInputPrefaceMetadata({ content: "notice text", senderId: RESTART_RESUME_NOTICE_SENDER_ID, originalContent: null, noticeId: "restart-resume:t:worker-1" }) };
    const observer = restartNoticeLifecycleObserver(() => ({ runId: "worker-1", publishEvent }), message);
    observer({ kind: "admitted" });
    expect(publishEvent).not.toHaveBeenCalled();
    observer({ kind: "forwarded", dispatchKind: "start_turn", turnId: "turn-7" });
    expect(publishEvent).toHaveBeenCalledExactlyOnceWith({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "worker-1",
      statusHint: null, payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: "notice text", message_id: "restart-resume:t:worker-1", turn_id: "turn-7" } });
  });

  it("publishes nothing when the run is not there, and never throws for a failed publication", async () => {
    const x = { content: "x", metadata: {} };
    expect(() => restartNoticeLifecycleObserver(() => null, x)({ kind: "forwarded", dispatchKind: "start_turn", turnId: null })).not.toThrow();
    const failing = { runId: "r", publishEvent: vi.fn(async () => { throw new Error("closed"); }) };
    expect(() => restartNoticeLifecycleObserver(() => failing, x)({ kind: "forwarded", dispatchKind: "start_turn", turnId: null })).not.toThrow();
    await Promise.resolve();
    expect(failing.publishEvent).toHaveBeenCalledWith(expect.objectContaining({ payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: "x", message_id: null } }));
  });
});

describe("restart notice in a run's memory", () => {
  const dirs: string[] = [];
  afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

  it("records the notice once, as a system notice and never as a user message", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "restart-notice-memory-"));
    dirs.push(memoryDir);
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const accumulator = new RuntimeMemoryEventAccumulator({ runId: "host-1", writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
    const notice = buildRestartNotice({ agentRunId: "host-1", facts: facts(), resumedDelegated: [] });
    accumulator.recordRunEvent({ eventType: AgentRunEventType.TURN_STARTED, runId: "host-1", payload: { turn_id: "turn-9" }, statusHint: null });
    accumulator.recordForwardedUserMessage({ runId: "host-1", runtimeKind: "codex_app_server" as never, config: {} as never,
      platformAgentRunId: null, message: notice, result: { accepted: true, turnId: "turn-9" }, forwardedAt: new Date() });
    accumulator.recordRunEvent({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "host-1", statusHint: null,
      payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: notice.content, turn_id: "turn-9" } });

    const traces = new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
      .getRunMemoryView(path.basename(memoryDir), { includeRawTraces: true, includeArchive: false }).rawTraces ?? [];
    expect(traces.map((trace) => [trace.traceType, trace.senderId, trace.content])).toEqual([
      ["system_task_notification", RESTART_RESUME_NOTICE_SENDER_ID, notice.content],
    ]);
  });
});
